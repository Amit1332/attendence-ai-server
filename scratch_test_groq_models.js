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

async function testModel(modelName) {
  const settings = getAISettings();
  const groqKey = settings.groqApiKey || process.env.GROQ_API_KEY;
  const client = new OpenAI({
    apiKey: groqKey,
    baseURL: "https://api.groq.com/openai/v1",
  });
  
  console.log(`\nTesting model: ${modelName}...`);
  try {
    const response = await client.chat.completions.create({
      model: modelName,
      messages: [{ role: "user", content: "Say hello!" }],
      max_tokens: 10,
    });
    console.log(`SUCCESS for ${modelName}! Response:`, response.choices[0].message.content);
    return true;
  } catch (error) {
    console.log(`FAILED for ${modelName}:`, error.message);
    return false;
  }
}

async function run() {
  await testModel("llama-3.3-70b-versatile");
  await testModel("llama-3.1-8b-instant");
  await testModel("llama3-8b-8192");
  await testModel("gemma2-9b-it");
}

run();
