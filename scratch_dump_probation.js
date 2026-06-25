const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function run() {
  const chunks = await prisma.documentChunk.findMany({
    where: {
      content: {
        contains: "probation",
        mode: "insensitive"
      }
    }
  });
  
  console.log(`Found ${chunks.length} chunks containing 'probation':\n`);
  chunks.forEach((c, idx) => {
    console.log(`=== CHUNK ${idx} ===`);
    console.log(c.content);
    console.log("====================\n");
  });
  
  await prisma.$disconnect();
}

run();
