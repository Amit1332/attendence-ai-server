import prisma from "./src/config/prisma";
import { generateLocalEmbedding } from "./src/utils/aiSettings";

async function run() {
  try {
    console.log("Fetching all document chunks...");
    const chunks = await prisma.documentChunk.findMany({
      select: {
        id: true,
        content: true
      }
    });
    
    console.log(`Found ${chunks.length} chunks to update.`);
    
    let count = 0;
    for (const chunk of chunks) {
      // Calculate new embedding vector
      const vector = generateLocalEmbedding(chunk.content);
      const formattedVector = `[${vector.join(",")}]`;
      
      // Update in database using raw query
      await prisma.$executeRawUnsafe(
        `UPDATE "DocumentChunk" SET embedding = $1::vector WHERE id = $2`,
        formattedVector,
        chunk.id
      );
      
      count++;
      if (count % 10 === 0 || count === chunks.length) {
        console.log(`Updated ${count}/${chunks.length} chunks...`);
      }
    }
    
    console.log("All chunks re-indexed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
