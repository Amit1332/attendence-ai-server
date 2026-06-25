import { OpenAI } from "openai";
import { PDFParse } from "pdf-parse";
import { HTTP_STATUS_CODES } from "@simple-node/http-status-codes";
import crypto from "crypto";

import config from "../config/config";
import ApiError from "../utils/ApiError";
import prisma from "../config/prisma";
import { DocumentType } from "@prisma/client";
import { getAISettings, generateLocalEmbedding, stopwords, stem } from "../utils/aiSettings";

// Get AI Client depending on selected provider in settings
const getAIClient = () => {
  const settings = getAISettings();
  const provider = settings.provider || "OPENAI";

  if (provider === "GROQ") {
    const groqKey = settings.groqApiKey || process.env.GROQ_API_KEY || "";
    if (!groqKey) {
      throw new ApiError(
        HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
        "Groq API key is not configured. Please set GROQ_API_KEY in the Settings or .env file."
      );
    }
    return {
      client: new OpenAI({
        apiKey: groqKey,
        baseURL: "https://api.groq.com/openai/v1",
      }),
      modelName: "llama-3.3-70b-versatile",
    };
  } else {
    // Default: OpenAI
    const openAIKey = settings.openaiApiKey || config.openaiApiKey || process.env.OPENAI_API_KEY || "";
    if (!openAIKey || openAIKey === "your-openai-api-key-here") {
      throw new ApiError(
        HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
        "OpenAI API key is not configured. Please set OPENAI_API_KEY in the Settings or .env file."
      );
    }
    return {
      client: new OpenAI({
        apiKey: openAIKey,
      }),
      modelName: "gpt-4o-mini",
    };
  }
};

class AIService {
  /**
   * Helper to ensure the pgvector extension is created in the database
   */
  async ensureVectorExtension() {
    try {
      await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector;`);
    } catch (error) {
      console.warn("Failed to check/create vector extension, it might already exist or permission is denied.", error);
    }
  }

  /**
   * Generate vector embedding for a given text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const settings = getAISettings();
    const openAIKey = settings.openaiApiKey || config.openaiApiKey || process.env.OPENAI_API_KEY || "";

    // Use OpenAI embeddings if API key is present, even if Grok is selected as LLM
    if (openAIKey && openAIKey !== "your-openai-api-key-here") {
      try {
        const openai = new OpenAI({ apiKey: openAIKey });
        const response = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: text.replace(/\n/g, " "),
        });
        return response.data[0].embedding;
      } catch (error: any) {
        console.warn("OpenAI embedding generation failed, falling back to local hashing", error);
      }
    }

    // Fallback: Hashing trick projects text to unit vector in 1536-dimensional space (entirely free and local!)
    return generateLocalEmbedding(text);
  }

  /**
   * Process and index a company document (RAG pipeline)
   */
  async uploadDocument(
    userId: string,
    title: string,
    documentType: DocumentType,
    fileBuffer: Buffer,
    fileName: string
  ) {
    await this.ensureVectorExtension();

    // Extract text from PDF buffer
    let pdfText = "";
    let parser: PDFParse | null = null;
    try {
      parser = new PDFParse({ data: new Uint8Array(fileBuffer) });
      const data = await parser.getText();
      pdfText = data.text;
    } catch (error: any) {
      throw new ApiError(
        HTTP_STATUS_CODES.BAD_REQUEST,
        `Failed to extract text from PDF: ${error.message}`
      );
    } finally {
      if (parser) {
        await parser.destroy();
      }
    }

    if (!pdfText || pdfText.trim().length === 0) {
      throw new ApiError(
        HTTP_STATUS_CODES.BAD_REQUEST,
        "PDF file is empty or no extractable text found."
      );
    }

    // Save document details
    const document = await prisma.document.create({
      data: {
        title,
        fileName,
        documentType,
        uploadedById: userId,
      },
    });

    // Chunk text: ~800 characters with 100 character overlap
    const chunkSize = 800;
    const overlap = 100;
    const chunks: string[] = [];
    
    let index = 0;
    while (index < pdfText.length) {
      const chunk = pdfText.substring(index, index + chunkSize).trim();
      if (chunk.length > 0) {
        chunks.push(chunk);
      }
      index += chunkSize - overlap;
    }

    // Process and insert chunks
    for (const chunkContent of chunks) {
      const embedding = await this.generateEmbedding(chunkContent);
      const chunkId = crypto.randomUUID();

      // Insert chunk content and vector embedding using raw query
      await prisma.$executeRawUnsafe(
        `INSERT INTO "DocumentChunk" (id, "documentId", content, embedding) VALUES ($1, $2, $3, $4::vector)`,
        chunkId,
        document.id,
        chunkContent,
        `[${embedding.join(",")}]`
      );
    }

    return document;
  }

  /**
   * Helper to re-rank chunks using keyword overlap and rule-based HR stemmer
   */
  reRankChunks(question: string, matchedChunks: any[]): any[] {
    const queryWords = question.toLowerCase().match(/\w+/g) || [];
    const queryStems = new Set(queryWords.map((w: string) => stem(w)).filter((w: string) => !stopwords.has(w)));

    const scored = matchedChunks.map(chunk => {
      const docWords = chunk.content.toLowerCase().match(/\w+/g) || [];
      const docStems = docWords.map((w: string) => stem(w)).filter((w: string) => !stopwords.has(w));
      const docStemsSet = new Set(docStems);

      let uniqueMatches = 0;
      queryStems.forEach((w: string) => {
        if (docStemsSet.has(w)) {
          uniqueMatches++;
        }
      });

      let termFreqScore = 0;
      queryStems.forEach((qw: string) => {
        const count = docStems.filter((dw: string) => dw === qw).length;
        termFreqScore += Math.min(count, 3);
      });

      const coverage = queryStems.size > 0 ? (uniqueMatches / queryStems.size) : 0;
      const coverageBoost = coverage === 1.0 ? 2.0 : (coverage >= 0.5 ? 0.5 : 0.0);

      // Final hybrid score combining cosine similarity and keyword relevance
      const keywordMatchScore = (uniqueMatches * 1.5) + (termFreqScore * 0.1) + coverageBoost;
      const finalScore = chunk.similarity + keywordMatchScore;

      return {
        ...chunk,
        finalScore
      };
    });

    // Sort by finalScore descending
    scored.sort((a, b) => b.finalScore - a.finalScore);
    return scored;
  }

  /**
   * Retrieve relevant chunks using hybrid search (vector similarity + keyword re-ranking)
   * with a fallback to the policy overview (first 6 chunks of the document) if no topic matches.
   */
  async retrieveRelevantChunks(question: string, matchedChunks: any[]): Promise<any[]> {
    const reRanked = this.reRankChunks(question, matchedChunks);
    let topChunks = reRanked.slice(0, 6);

    // If the top chunk has no keyword match (meaning we only matched common stopwords, or the query is very general),
    // we fall back to the first 6 chunks of the document (which contain the overview / Table of Contents).
    const hasKeywordMatch = reRanked.length > 0 && (reRanked[0].finalScore - reRanked[0].similarity >= 1.0);
    if (!hasKeywordMatch) {
      try {
        const fallbackChunks = await prisma.documentChunk.findMany({
          take: 6,
          orderBy: {
            createdAt: "asc"
          },
          include: {
            document: true
          }
        });

        if (fallbackChunks.length > 0) {
          topChunks = fallbackChunks.map(c => ({
            content: c.content,
            title: c.document.title,
            documentType: c.document.documentType,
            similarity: 0.1,
            finalScore: 0.1
          }));
        }
      } catch (err) {
        console.warn("Failed to retrieve fallback overview chunks:", err);
      }
    }

    return topChunks;
  }

  /**
   * Answer questions about company policies using RAG
   */
  async askPolicyQuestion(question: string): Promise<string> {
    await this.ensureVectorExtension();
    const { client, modelName } = getAIClient();

    // 1. Embed query
    const questionEmbedding = await this.generateEmbedding(question);

    // 2. Query nearest chunks (retrieve more candidates for hybrid re-ranking)
    const formattedVector = `[${questionEmbedding.join(",")}]`;
    const matchedChunks: any[] = await prisma.$queryRawUnsafe(
      `SELECT c.content, d.title, d."documentType", 1 - (c.embedding <=> $1::vector) AS similarity
       FROM "DocumentChunk" c
       JOIN "Document" d ON c."documentId" = d.id
       ORDER BY c.embedding <=> $1::vector ASC
       LIMIT 35`,
      formattedVector
    );

    // Re-rank and retrieve top chunks with introduction fallback
    const topChunks = await this.retrieveRelevantChunks(question, matchedChunks);

    // Filter relevant excerpts
    const relevantExcerpts = topChunks
      .map((chunk) => `[Source: ${chunk.title} (${chunk.documentType})] ${chunk.content}`)
      .join("\n\n");

    if (!relevantExcerpts) {
      return "I couldn't find any relevant company policies in our database to answer your question. Please make sure policy documents are uploaded.";
    }

    // 3. Generate response using AI
    const systemPrompt = `You are a helpful HR Policy Assistant. Answer the user's question accurately using ONLY the provided policy excerpts. If the excerpts do not contain the answer, say "I cannot find the answer in the current company policies. Please contact HR directly." Do not make up answers.
    
    Excerpts:
    ${relevantExcerpts}`;

    try {
      const completion = await client.chat.completions.create({
        model: modelName,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question },
        ],
        temperature: 0.2,
      });

      return completion.choices[0].message.content || "No response generated.";
    } catch (error: any) {
      throw new ApiError(
        HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
        `AI completion failed: ${error.message}`
      );
    }
  }

  /**
   * Save or update an employee's semantic profile
   */
  async saveEmployeeProfileEmbedding(userId: string, profile: { skills: string[]; experience: string; department: string }) {
    await this.ensureVectorExtension();

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new ApiError(HTTP_STATUS_CODES.NOT_FOUND, "User not found");
    }

    const name = `${user.firstName} ${user.lastName}`;
    const skillsString = profile.skills.join(", ");

    // Format descriptive profile string
    const profileText = `Name: ${name}, Department: ${profile.department}, Skills: ${skillsString}, Experience: ${profile.experience}, Email: ${user.email}, Role: ${user.role}`;

    const embedding = await this.generateEmbedding(profileText);
    const formattedVector = `[${embedding.join(",")}]`;

    // Check if embedding exists
    const existing = await prisma.employeeEmbedding.findFirst({
      where: { userId },
    });

    if (existing) {
      await prisma.$executeRawUnsafe(
        `UPDATE "EmployeeEmbedding" SET content = $1, embedding = $2::vector WHERE id = $3`,
        profileText,
        formattedVector,
        existing.id
      );
    } else {
      const id = crypto.randomUUID();
      await prisma.$executeRawUnsafe(
        `INSERT INTO "EmployeeEmbedding" (id, "userId", content, embedding) VALUES ($1, $2, $3, $4::vector)`,
        id,
        userId,
        profileText,
        formattedVector
      );
    }

    return { success: true, profileText };
  }

  /**
   * Search for employees semantically
   */
  async searchEmployeesSemantically(query: string, managerId?: string) {
    await this.ensureVectorExtension();

    const queryEmbedding = await this.generateEmbedding(query);
    const formattedVector = `[${queryEmbedding.join(",")}]`;

    let queryStr = `
      SELECT e.id, e."userId", e.content, 1 - (e.embedding <=> $1::vector) AS similarity,
              u."firstName", u."lastName", u.email, u.role, u."isActive"
      FROM "EmployeeEmbedding" e
      JOIN "User" u ON e."userId" = u.id
    `;
    
    const params: any[] = [formattedVector];

    if (managerId) {
      queryStr += ` WHERE u."managerId" = $2`;
      params.push(managerId);
    }

    queryStr += `
      ORDER BY e.embedding <=> $1::vector ASC
      LIMIT 10
    `;

    const matches: any[] = await prisma.$queryRawUnsafe(queryStr, ...params);

    return matches;
  }

  /**
   * Answer attendance-related natural language questions using AI tool/function calling
   */
  async askAttendanceQuestion(question: string, currentUser?: { id: string; role: string }): Promise<string> {
    const { client, modelName } = getAIClient();

    // Define DB helper tools for the AI model
    const tools: any[] = [
      {
        type: "function",
        function: {
          name: "getEmployeesList",
          description: "Get a list of all employees in the system, including their id, name, role, department, active status.",
          parameters: { type: "object", properties: {} },
        },
      },
      {
        type: "function",
        function: {
          name: "getAttendanceRecords",
          description: "Get attendance details including checkIn, checkOut, workingHours, and overtimeHours. Filters by userId or date ranges.",
          parameters: {
            type: "object",
            properties: {
              userId: { type: "string", description: "Filter by user ID" },
              startDate: { type: "string", description: "Start date filter (ISO format, e.g., '2026-06-01')" },
              endDate: { type: "string", description: "End date filter (ISO format, e.g., '2026-06-30')" },
            },
          },
        },
      },
      {
        type: "function",
        function: {
          name: "searchCompanyPolicies",
          description: "Search or query the company policies, rules, benefits, guidelines, and HR documents for answers using natural language semantic search (RAG). Use this whenever the user asks about leaves, probation, benefits, or general HR rules.",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "The search query or question describing the HR policy details to search for (e.g., 'vacation policy', 'probation period details', 'remote work rules').",
              },
            },
            required: ["query"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "searchEmployeeProfiles",
          description: "Search employee profiles (names, skills, experience, department) semantically using a natural language query. Use this tool when the user asks about specific employee skills, technology, experience, qualifications, or department roles.",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "The skill, experience, or department description to search for (e.g. 'React developer', 'Python experience', '5 years in Marketing')."
              }
            },
            required: ["query"]
          }
        }
      }
    ];

    // Maintain context messages
    const messages: any[] = [
      {
        role: "system",
        content: `You are an AI HR, Attendance, and Policy Assistant. You answer questions about employee attendance, absences, overtime, skills, experience, and general company HR policies/rules by executing tool functions to query database records and company document repositories.
        Note: The current date/time is ${new Date().toISOString()}. Use this to calculate monthly/weekly ranges (e.g., 'this month', 'last week').
        
        CRITICAL RULES FOR CALCULATIONS & LOGIC:
        1. Routing:
           - For employee names, listings, details, skills, experience, and presence today: use 'getEmployeesList' or 'searchEmployeeProfiles'.
           - For attendance records, check-ins, check-outs, working hours, and overtime: use 'getAttendanceRecords' (filter by userId and/or date range).
           - For company rules, benefits, leaves, vacation allowance, and general policies: use 'searchCompanyPolicies'.
        2. Absences:
           - To find how many days an employee was absent, first call 'getAttendanceRecords' for that employee and range.
           - Compare the check-in logs against the past weekdays (Monday to Friday, excluding future days) in the requested range.
           - Every weekday with no check-in record counts as an absence. List the absent dates or counts clearly.
        3. Attendance Rates:
           - To find the attendance rate (e.g. 'less than 80% attendance' or 'highest rate'), compare the number of unique check-in days for each user against the total weekdays (Monday to Friday) in the period up to today.
           - Rate = (Unique Check-in Days / Weekdays in period) * 100%.
           - Note: For the current month of June 2026 up to today (June 25, 2026), there are exactly 19 working days (weekdays). Use 19 as the total working days for "this month" calculations.
           - For any employee with no attendance records in the database, count their unique check-in days as 0 (resulting in a 0% attendance rate). Do not omit them or state that you cannot calculate it.
           - For team/department attendance rates, group employees by department using 'getEmployeesList', calculate the rates for each employee, and average them for the team.
        4. Overtime:
           - Query 'getAttendanceRecords' for the period. Filter and list employees who have 'overtimeHours > 0', summarizing their total hours.
        5. Safety:
           - Once you have executed a tool and obtained relevant records or policy excerpts, formulate your final answer based strictly on the retrieved information.
           - Do not make up any numbers, dates, or HR policies. If data is not present, clearly state that.`,
      },
      { role: "user", content: question },
    ];

    try {
      // 1. Initial Call
      let response = await client.chat.completions.create({
        model: modelName,
        messages,
        tools,
        tool_choice: "auto",
        temperature: 0.0,
      });

      let responseMessage = response.choices[0].message;

      // 2. Loop while the model requests tool calls
      let runIterations = 0;
      while (responseMessage.tool_calls && runIterations < 5) {
        runIterations++;
        messages.push(responseMessage); // append assistant request to history

        for (const toolCall of responseMessage.tool_calls) {
          const functionName = (toolCall as any).function.name;
          const args = JSON.parse((toolCall as any).function.arguments);
          let toolResult = "";

          if (functionName === "getEmployeesList") {
            const userWhere: any = {};
            if (currentUser?.role === "MANAGER") {
              userWhere.managerId = currentUser.id;
            }
            const users = await prisma.user.findMany({
              where: userWhere,
              include: { department: true, embeddings: true },
            });
            toolResult = JSON.stringify(
              users.map((u) => ({
                id: u.id,
                name: `${u.firstName} ${u.lastName}`,
                email: u.email,
                role: u.role,
                department: u.department?.name || "None",
                isActive: u.isActive,
                profile: u.embeddings[0]?.content || "No profile details indexed",
              }))
            );
          } else if (functionName === "getAttendanceRecords") {
            const whereClause: any = {};
            if (args.userId) {
              whereClause.userId = args.userId;
            }
            if (currentUser?.role === "MANAGER") {
              whereClause.user = {
                managerId: currentUser.id,
              };
            }
            if (args.startDate || args.endDate) {
              whereClause.checkIn = {};
              if (args.startDate) {
                const start = new Date(args.startDate);
                start.setUTCHours(0, 0, 0, 0);
                whereClause.checkIn.gte = start;
              }
              if (args.endDate) {
                const end = new Date(args.endDate);
                end.setUTCHours(23, 59, 59, 999);
                whereClause.checkIn.lte = end;
              }
            }

            const attendance = await prisma.attendance.findMany({
              where: whereClause,
              include: { user: true },
            });

            toolResult = JSON.stringify(
              attendance.map((a) => ({
                id: a.id,
                userId: a.userId,
                employeeName: `${a.user.firstName} ${a.user.lastName}`,
                checkIn: a.checkIn,
                checkOut: a.checkOut,
                workingHours: a.workingHours,
                overtimeHours: a.overtimeHours,
              }))
            );
          } else if (functionName === "searchEmployeeProfiles") {
            try {
              const queryText = args.query;
              const managerId = currentUser?.role === "MANAGER" ? currentUser.id : undefined;
              const profiles = await this.searchEmployeesSemantically(queryText, managerId);
              toolResult = JSON.stringify(
                profiles.map((p) => ({
                  userId: p.userId,
                  employeeName: `${p.firstName} ${p.lastName}`,
                  email: p.email,
                  role: p.role,
                  profileContent: p.content,
                  similarity: p.similarity,
                }))
              );
            } catch (err: any) {
              console.error("Error searching employee profiles:", err);
              toolResult = `Error searching employee profiles: ${err.message}`;
            }
          } else if (functionName === "searchCompanyPolicies" || functionName === "getHrPolicy") {
            const queryText = args.query || args.question || question;
            try {
              // 1. Embed query
              const queryEmbedding = await this.generateEmbedding(queryText);
              const formattedVector = `[${queryEmbedding.join(",")}]`;

              // 2. Query nearest chunks (retrieve more candidates for hybrid re-ranking)
              const matchedChunks: any[] = await prisma.$queryRawUnsafe(
                `SELECT c.content, d.title, d."documentType", 1 - (c.embedding <=> $1::vector) AS similarity
                 FROM "DocumentChunk" c
                 JOIN "Document" d ON c."documentId" = d.id
                 ORDER BY c.embedding <=> $1::vector ASC
                 LIMIT 35`,
                formattedVector
              );

              // Re-rank and retrieve top chunks with introduction fallback
              const topChunks = await this.retrieveRelevantChunks(queryText, matchedChunks);

              // Filter relevant excerpts
              const relevantExcerpts = topChunks
                .map((chunk) => `[Source Document: ${chunk.title} (${chunk.documentType})] ${chunk.content}`)
                .join("\n\n");

              toolResult = relevantExcerpts || "No relevant company policy documents found for this query in the database.";
            } catch (err: any) {
              console.error("Error searching company policies:", err);
              toolResult = `Error searching company policies: ${err.message}`;
            }
          }

          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            name: functionName,
            content: toolResult,
          });
        }

        // Call LLM again with tool execution results
        response = await client.chat.completions.create({
          model: modelName,
          messages,
          tools,
          tool_choice: "auto",
          temperature: 0.0,
        });
        responseMessage = response.choices[0].message;
      }

      return responseMessage.content || "Could not generate an answer.";
    } catch (error: any) {
      console.error("AI Assistant failed. Details:");
      if (error.response) {
        console.error("Status:", error.response.status);
        console.error("Data:", JSON.stringify(error.response.data, null, 2));
      } else {
        console.error("Error object:", error);
      }
      if (error.failed_generation) {
        console.error("failed_generation:", error.failed_generation);
      }
      throw new ApiError(
        HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
        `AI Assistant failed: ${error.message}`
      );
    }
  }

  /**
   * Get all uploaded documents
   */
  async getDocuments() {
    return prisma.document.findMany({
      include: {
        uploadedBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  /**
   * Delete an indexed document and its chunks
   */
  async deleteDocument(documentId: string) {
    // Delete chunks first due to foreign key constraints
    await prisma.documentChunk.deleteMany({
      where: { documentId },
    });

    return prisma.document.delete({
      where: { id: documentId },
    });
  }
}

export default new AIService();
