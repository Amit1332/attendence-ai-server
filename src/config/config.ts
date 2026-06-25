import dotenv from "dotenv";
import path from "path";
import { z } from "zod";

dotenv.config({
  path: path.join(__dirname, "../../.env"),
});

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  PORT: z.coerce.number().default(4000),

  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),

  JWT_ACCESS_EXPIRATION_MINUTES: z.coerce.number().default(30),

  JWT_REFRESH_EXPIRATION_DAYS: z.coerce.number().default(7),

  OPENAI_API_KEY: z.string().default(""),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Environment variable validation failed:");
  console.error(parsed.error.format());
  process.exit(1);
}

const env = parsed.data;

const config = {
  env: env.NODE_ENV,

  port: env.PORT,

  jwt: {
    secret: env.JWT_SECRET,
    accessExpirationMinutes: env.JWT_ACCESS_EXPIRATION_MINUTES,
    refreshExpirationDays: env.JWT_REFRESH_EXPIRATION_DAYS,
  },

  openaiApiKey: env.OPENAI_API_KEY,
} as const;

export default config;