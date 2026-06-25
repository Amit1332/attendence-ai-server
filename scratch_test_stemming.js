const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const stopwords = new Set([
  // General English stopwords
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't", "as", "at", 
  "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can", "can't", "cannot", "could", "couldn't", 
  "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during", "each", "few", "for", "from", "further", 
  "had", "hadn't", "has", "hasn't", "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here", "here's", "hers", "herself", 
  "him", "himself", "his", "how", "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's", "its", "itself", 
  "let's", "me", "more", "most", "mustn't", "my", "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought", 
  "our", "ours", "ourselves", "out", "over", "own", "same", "shan't", "she", "she'd", "she'll", "she's", "should", "shouldn't", "so", 
  "some", "such", "than", "that", "that's", "the", "their", "theirs", "them", "themselves", "then", "there", "there's", "these", "they", 
  "they'd", "they'll", "they're", "they've", "this", "those", "through", "to", "too", "under", "until", "up", "very", "was", "wasn't", 
  "we", "we'd", "we'll", "we're", "we've", "were", "weren't", "what", "what's", "when", "when's", "where", "where's", "which", "while", 
  "who", "who's", "whom", "why", "why's", "with", "won't", "would", "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", 
  "yours", "yourself", "yourselves",
  
  // Domain-specific HR stopwords that appear in almost all chunks
  "company", "employee", "employees", "policy", "policies", "handbook", "pragyan", "gmr", "group", "hr", 
  "procedure", "procedures", "eligibility", "applicability", "purpose", "objective", "guidelines", 
  "rules", "rule", "regulation", "regulations", "shall", "will", "would", "may", "can", "must", 
  "provide", "provides", "provided", "subject", "change", "refer", "portal", "annexure", "section", "chapter", "detail", "details",
  
  // Temporal/structural noise words in policy documents
  "period", "periods", "date", "dates", "time", "times", "day", "days", "month", "months", "year", "years", 
  "hour", "hours", "week", "weeks", "calendar", "financial", "every", "each", "per", "annual", "monthly", "weekly"
]);

function stem(word) {
  word = word.toLowerCase().trim();
  if (word.length <= 2) return word;
  
  // Rule-based mapping for HR domain
  if (word.startsWith("probation")) return "probation";
  if (word.startsWith("leave") || word === "leaves" || word === "leaving") return "leave";
  if (word.startsWith("attend")) return "attend";
  if (word.startsWith("absent") || word.startsWith("absence")) return "absent";
  if (word.startsWith("reimburse")) return "reimburse";
  if (word.startsWith("compensat")) return "compensate";
  if (word.startsWith("benefit")) return "benefit";
  if (word.startsWith("allowance")) return "allowance";
  if (word.startsWith("salary") || word.startsWith("salari")) return "salary";
  if (word.startsWith("holiday")) return "holiday";
  if (word.startsWith("overtime")) return "overtime";
  if (word.startsWith("medical")) return "medical";
  if (word.startsWith("insur")) return "insurance";
  if (word.startsWith("accident")) return "accident";
  if (word.startsWith("welfare")) return "welfare";
  if (word.startsWith("claim")) return "claim";
  if (word.startsWith("payme") || word.startsWith("paying") || word === "pay" || word === "pays") return "pay";
  if (word.startsWith("travel")) return "travel";
  
  // General English stem suffix rules
  if (word.endsWith("ies")) return word.slice(0, -3) + "y";
  if (word.endsWith("ves")) return word.slice(0, -3) + "f";
  if (word.endsWith("s") && !word.endsWith("ss") && !word.endsWith("us") && !word.endsWith("is") && !word.endsWith("as")) {
    if (word.endsWith("es")) {
      return word.slice(0, -2);
    }
    return word.slice(0, -1);
  }
  if (word.endsWith("ing")) return word.slice(0, -3);
  if (word.endsWith("ed")) return word.slice(0, -2);
  
  return word;
}

const generateLocalEmbedding = (text) => {
  const vector = new Array(1536).fill(0);
  const words = text.toLowerCase().match(/\w+/g) || [];
  
  const stems = words.map(w => stem(w)).filter(w => !stopwords.has(w) && w.length > 0);
  const targetWords = stems.length > 0 ? stems : words;

  for (const word of targetWords) {
    let hash = 5381;
    for (let i = 0; i < word.length; i++) {
      hash = (hash * 33) ^ word.charCodeAt(i);
    }
    
    const index = Math.abs(hash) % 1536;
    vector[index] += 1;
  }
  
  let sumSquares = 0;
  for (let i = 0; i < 1536; i++) {
    sumSquares += vector[i] * vector[i];
  }
  const magnitude = Math.sqrt(sumSquares);
  
  if (magnitude > 0) {
    for (let i = 0; i < 1536; i++) {
      vector[i] = vector[i] / magnitude;
    }
  } else {
    vector[0] = 1;
  }
  
  return vector;
};

function getCosineSimilarity(v1, v2) {
  let dotProduct = 0;
  for (let i = 0; i < 1536; i++) {
    dotProduct += v1[i] * v2[i];
  }
  return dotProduct;
}

function getKeywordMatchScore(queryText, docText) {
  const queryWords = queryText.toLowerCase().match(/\w+/g) || [];
  const docWords = docText.toLowerCase().match(/\w+/g) || [];
  
  const queryStems = new Set(queryWords.map(w => stem(w)).filter(w => !stopwords.has(w)));
  const docStems = docWords.map(w => stem(w)).filter(w => !stopwords.has(w));
  const docStemsSet = new Set(docStems);
  
  let uniqueMatches = 0;
  queryStems.forEach(w => {
    if (docStemsSet.has(w)) {
      uniqueMatches++;
    }
  });
  
  let termFreqScore = 0;
  queryStems.forEach(qw => {
    const count = docStems.filter(dw => dw === qw).length;
    termFreqScore += Math.min(count, 3);
  });
  
  const coverage = queryStems.size > 0 ? (uniqueMatches / queryStems.size) : 0;
  const coverageBoost = coverage === 1.0 ? 2.0 : (coverage >= 0.5 ? 0.5 : 0.0);
  
  return (uniqueMatches * 1.5) + (termFreqScore * 0.1) + coverageBoost;
}

async function testInMemoryRAG(question) {
  console.log(`\nEvaluating question: "${question}"`);

  // Fetch all chunks from DB
  const chunks = await prisma.documentChunk.findMany();

  // Compute new embeddings for all chunks in-memory
  const indexedChunks = chunks.map(chunk => {
    return {
      content: chunk.content,
      embedding: generateLocalEmbedding(chunk.content)
    };
  });

  // Compute query embedding
  const queryVector = generateLocalEmbedding(question);

  // Compare in-memory using Cosine Similarity AND Keyword Match Re-ranking
  const matches = indexedChunks.map(chunk => {
    const similarity = getCosineSimilarity(queryVector, chunk.embedding);
    const keywordMatches = getKeywordMatchScore(question, chunk.content);
    
    // Combined score: we boost based on keyword matching
    const score = similarity + keywordMatches; 
    
    return {
      content: chunk.content,
      similarity: similarity,
      keywordMatches: keywordMatches,
      score: score
    };
  });

  // Sort by combined score descending
  matches.sort((a, b) => b.score - a.score);

  // Print top 3 matches
  matches.slice(0, 3).forEach((match, i) => {
    console.log(`  Match #${i+1} Score: ${match.score.toFixed(4)} (Similarity: ${match.similarity.toFixed(4)}, Keyword Matches Score: ${match.keywordMatches.toFixed(4)})`);
    console.log(`  Content: ${match.content.substring(0, 200).replace(/\n/g, ' ')}...`);
  });
}

async function run() {
  await testInMemoryRAG("what is the hr policy on leaves?");
  await testInMemoryRAG("leave policy");
  await testInMemoryRAG("probation period");
  await prisma.$disconnect();
}

run();
