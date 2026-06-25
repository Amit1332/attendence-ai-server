const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function run() {
  const docs = await prisma.document.findMany();
  console.log("Uploaded Documents:");
  console.log(JSON.stringify(docs, null, 2));
  await prisma.$disconnect();
}

run();
