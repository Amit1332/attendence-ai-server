const { OpenAI } = require("openai");
const fs = require("fs");
const path = require("path");

const settingsPath = path.join(__dirname, "src/config/ai-settings.json");

function getAISettings() {
  if (fs.existsSync(settingsPath)) {
    const fileData = fs.readFileSync(settingsPath, "utf-8");
    return JSON.parse(fileData);
  }
  return { provider: "OPENAI" };
}

async function runPresentToday() {
  const settings = getAISettings();
  const groqKey = settings.groqApiKey || process.env.GROQ_API_KEY;
  const client = new OpenAI({
    apiKey: groqKey,
    baseURL: "https://api.groq.com/openai/v1",
  });
  
  const modelName = "llama-3.3-70b-versatile";

  const tools = [
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
        name: "getHrPolicy",
        description: "Retrieve or search company HR policies, rules, benefits, leave parameters, and guidelines using natural language semantic search.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The search query or question describing the HR policy details to search for (e.g., 'leaves', 'vacation policy', 'overtime parameters').",
            },
          },
          required: ["query"],
        },
      },
    },
  ];

  const messages = [
    {
      role: "system",
      content: `You are an AI HR and Attendance Assistant. You answer questions about employee attendance, absences, overtime, and company HR policies/rules.
      The current date/time is ${new Date().toISOString()}. Use this to calculate monthly/weekly ranges (e.g. 'this month', 'last week').`,
    },
    { role: "user", content: "who was present today which one staff" },
  ];

  try {
    console.log("Calling Groq API with user query...");
    let response = await client.chat.completions.create({
      model: modelName,
      messages,
      tools,
      tool_choice: "auto",
      temperature: 0.0,
    });

    let msg = response.choices[0].message;
    console.log("Response:", JSON.stringify(msg, null, 2));

  } catch (error) {
    console.error("FAIL!");
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error("Error message:", error.message);
      if (error.failed_generation) {
        console.error("failed_generation:", error.failed_generation);
      } else {
        console.error("Full error:", error);
      }
    }
  }
}

runPresentToday();
