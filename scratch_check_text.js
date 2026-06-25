const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkText() {
  try {
    const totalChunks = await prisma.documentChunk.count();
    console.log("Total chunks in DB:", totalChunks);

    // Search for "probation"
    const probationMatches = await prisma.documentChunk.findMany({
      where: {
        content: {
          contains: "probation",
          mode: "insensitive"
        }
      }
    });
    console.log(`\nFound ${probationMatches.length} chunks containing "probation":`);
    probationMatches.forEach((chunk, i) => {
      console.log(`  Chunk #${i+1}: ${chunk.content.substring(0, 150)}...`);
    });

    // Search for "leave" or "leaves"
    const leaveMatches = await prisma.documentChunk.findMany({
      where: {
        content: {
          contains: "leave",
          mode: "insensitive"
        }
      }
    });
    console.log(`\nFound ${leaveMatches.length} chunks containing "leave":`);
    leaveMatches.slice(0, 5).forEach((chunk, i) => {
      console.log(`  Chunk #${i+1}: ${chunk.content.substring(0, 150)}...`);
    });

  } catch (error) {
    console.error("Failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkText();
