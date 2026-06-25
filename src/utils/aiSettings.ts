import fs from "fs";
import path from "path";
import prisma from "../config/prisma";

const settingsPath = path.join(__dirname, "../config/ai-settings.json");

export interface AISettings {
  provider: "OPENAI" | "GROQ";
  openaiApiKey?: string;
  groqApiKey?: string;
}

const defaultSettings: AISettings = {
  provider: "OPENAI",
  openaiApiKey: "",
  groqApiKey: "",
};

let cachedSettings: AISettings | null = null;
let isInitialized = false;

export const getAISettings = (): AISettings => {
  if (!isInitialized || !cachedSettings) {
    try {
      if (fs.existsSync(settingsPath)) {
        const fileData = fs.readFileSync(settingsPath, "utf-8");
        cachedSettings = JSON.parse(fileData);
      }
    } catch (e) {
      console.error("Failed to read local AI settings fallback.", e);
    }
    if (!cachedSettings) {
      cachedSettings = { ...defaultSettings };
    }
    isInitialized = true;
  }
  return cachedSettings;
};

export const initializeAISettings = async () => {
  try {
    const settingsList = await prisma.systemSetting.findMany({
      where: {
        key: {
          in: ["ai_provider", "openai_api_key", "groq_api_key"],
        },
      },
    });

    const settingsMap = new Map(settingsList.map((s) => [s.key, s.value]));

    const dbSettings: AISettings = {
      provider: (settingsMap.get("ai_provider") as any) || "OPENAI",
      openaiApiKey: settingsMap.get("openai_api_key") || "",
      groqApiKey: settingsMap.get("groq_api_key") || "",
    };

    cachedSettings = dbSettings;
    isInitialized = true;
    console.log("AI settings successfully loaded from database.");
  } catch (e) {
    console.error("Failed to load AI settings from database, using local config/defaults.", e);
    getAISettings(); // Fallback to local file / defaults
  }
};

export const saveAISettings = (settings: Partial<AISettings>) => {
  try {
    const current = getAISettings();
    const updated = { ...current, ...settings };
    
    // Update cache
    cachedSettings = updated;
    isInitialized = true;

    // Save to Database asynchronously
    const saveToDb = async () => {
      try {
        const keysToSave = [
          { key: "ai_provider", value: updated.provider },
          { key: "openai_api_key", value: updated.openaiApiKey || "" },
          { key: "groq_api_key", value: updated.groqApiKey || "" },
        ];

        for (const item of keysToSave) {
          await prisma.systemSetting.upsert({
            where: { key: item.key },
            update: { value: item.value },
            create: { key: item.key, value: item.value },
          });
        }
        console.log("AI settings successfully saved to database.");
      } catch (dbErr) {
        console.error("Failed to save AI settings to database:", dbErr);
      }
    };
    saveToDb();

    // Local file fallback backup
    const dir = path.dirname(settingsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(settingsPath, JSON.stringify(updated, null, 2), "utf-8");
    return updated;
  } catch (e) {
    console.error("Failed to write AI settings.", e);
    throw e;
  }
};

// Standard English stopwords combined with HR policy and structural domain stopwords
export const stopwords = new Set([
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
  
  // Domain-specific HR stopwords
  "company", "employee", "employees", "policy", "policies", "handbook", "pragyan", "gmr", "group", "hr", 
  "procedure", "procedures", "eligibility", "applicability", "purpose", "objective", "guidelines", 
  "rules", "rule", "regulation", "regulations", "shall", "will", "would", "may", "can", "must", 
  "provide", "provides", "provided", "subject", "change", "refer", "portal", "annexure", "section", "chapter", "detail", "details",
  
  // Temporal/structural noise words
  "period", "periods", "date", "dates", "time", "times", "day", "days", "month", "months", "year", "years", 
  "hour", "hours", "week", "weeks", "calendar", "financial", "every", "each", "per", "annual", "monthly", "weekly"
]);

// Rule-based stemmer mapping variations to base domain terms
export const stem = (word: string): string => {
  word = word.toLowerCase().trim();
  if (word.length <= 2) return word;
  
  // Stemming rules for GMR HR Policy Domain
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
  
  // Suffix strip rules
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
};

/**
 * Deterministic local text embedder projecting text onto a 1536-dimensional space (hashing trick).
 * Pre-filters English & domain stopwords, and stems words for maximum keyword relevance.
 */
export const generateLocalEmbedding = (text: string): number[] => {
  const vector = new Array(1536).fill(0);
  const words = text.toLowerCase().match(/\w+/g) || [];
  
  // Filter stopwords and stem words
  const stems = words.map(w => stem(w)).filter(w => !stopwords.has(w) && w.length > 0);
  const targetWords = stems.length > 0 ? stems : words;
  
  for (const word of targetWords) {
    // Hash function (djb2)
    let hash = 5381;
    for (let i = 0; i < word.length; i++) {
      hash = (hash * 33) ^ word.charCodeAt(i);
    }
    
    const index = Math.abs(hash) % 1536;
    vector[index] += 1;
  }
  
  // L2 Normalization
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
