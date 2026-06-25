import aiService from "./src/services/ai.service";

async function run() {
  try {
    console.log("Asking RAG policy assistant about leaves...");
    const answer = await aiService.askAttendanceQuestion("what is the hr policy on leaves?");
    console.log("\n--- AI Assistant Response ---");
    console.log(answer);
    console.log("-----------------------------\n");
    
    console.log("Asking RAG policy assistant about probation...");
    const probationAnswer = await aiService.askAttendanceQuestion("who is eligible for the superannuation fund? are probationers eligible?");
    console.log("\n--- AI Assistant Response ---");
    console.log(probationAnswer);
    console.log("-----------------------------\n");
  } catch (error) {
    console.error("Test failed:", error);
  }
}

run();
