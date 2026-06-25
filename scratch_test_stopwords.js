const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const stopwords = new Set([
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
  "yours", "yourself", "yourselves"
]);

const generateLocalEmbeddingWithStopwords = (text) => {
  const vector = new Array(1536).fill(0);
  const words = text.toLowerCase().match(/\w+/g) || [];
  
  const filteredWords = words.filter(word => !stopwords.has(word));
  
  if (filteredWords.length === 0) {
    // If all words are stopwords, fallback to using all words
    words.forEach(word => {
      let hash = 5381;
      for (let i = 0; i < word.length; i++) {
        hash = (hash * 33) ^ word.charCodeAt(i);
      }
      const index = Math.abs(hash) % 1536;
      vector[index] += 1;
    });
  } else {
    filteredWords.forEach(word => {
      let hash = 5381;
      for (let i = 0; i < word.length; i++) {
        hash = (hash * 33) ^ word.charCodeAt(i);
      }
      const index = Math.abs(hash) % 1536;
      vector[index] += 1;
    });
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

async function testQuery(question) {
  console.log(`\nEvaluating question: "${question}"`);
  const embedding = generateLocalEmbeddingWithStopwords(question);
  const formattedVector = `[${embedding.join(",")}]`;

  try {
    const matchedChunks = await prisma.$queryRawUnsafe(
      `SELECT c.content, d.title, d."documentType", 1 - (c.embedding <=> $1::vector) AS similarity
       FROM "DocumentChunk" c
       JOIN "Document" d ON c."documentId" = d.id
       ORDER BY c.embedding <=> $1::vector ASC
       LIMIT 3`,
      formattedVector
    );

    matchedChunks.forEach((chunk, i) => {
      console.log(`  Match #${i+1}: Similarity: ${chunk.similarity.toFixed(4)} | Snippet: ${chunk.content.substring(0, 150).replace(/\n/g, ' ')}...`);
    });
  } catch (error) {
    console.error("Query failed:", error);
  }
}

async function run() {
  await testQuery("what is the hr policy on leaves?");
  await testQuery("leave policy");
  await testQuery("probation period");
  await prisma.$disconnect();
}

run();
