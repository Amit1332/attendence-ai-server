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

const generateLocalEmbedding = (text, useStopwordFilter = true) => {
  const vector = new Array(1536).fill(0);
  const words = text.toLowerCase().match(/\w+/g) || [];
  
  const filteredWords = useStopwordFilter ? words.filter(word => !stopwords.has(word)) : words;
  const targetWords = filteredWords.length > 0 ? filteredWords : words;

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

// Calculate dot product (cosine similarity since vectors are unit normalized)
function getCosineSimilarity(v1, v2) {
  let dotProduct = 0;
  for (let i = 0; i < 1536; i++) {
    dotProduct += v1[i] * v2[i];
  }
  return dotProduct;
}

async function testInMemoryRAG(question) {
  console.log(`\nEvaluating question: "${question}"`);

  // Fetch all chunks from DB
  const chunks = await prisma.documentChunk.findMany();

  // Compute new embeddings for all chunks in-memory
  const indexedChunks = chunks.map(chunk => {
    return {
      content: chunk.content,
      embedding: generateLocalEmbedding(chunk.content, true)
    };
  });

  // Compute query embedding
  const queryVector = generateLocalEmbedding(question, true);

  // Compare in-memory
  const matches = indexedChunks.map(chunk => {
    const similarity = getCosineSimilarity(queryVector, chunk.embedding);
    return {
      content: chunk.content,
      similarity: similarity
    };
  });

  // Sort by similarity descending
  matches.sort((a, b) => b.similarity - a.similarity);

  // Print top 3 matches
  matches.slice(0, 3).forEach((match, i) => {
    console.log(`  Match #${i+1} Similarity: ${match.similarity.toFixed(4)}`);
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
