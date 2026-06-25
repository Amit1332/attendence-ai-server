"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const zod_1 = require("zod");
dotenv_1.default.config({
    path: path_1.default.join(__dirname, "../../.env"),
});
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z
        .enum(["development", "production", "test"])
        .default("development"),
    PORT: zod_1.z.coerce.number().default(4000),
    JWT_SECRET: zod_1.z.string().min(1, "JWT_SECRET is required"),
    JWT_ACCESS_EXPIRATION_MINUTES: zod_1.z.coerce.number().default(30),
    JWT_REFRESH_EXPIRATION_DAYS: zod_1.z.coerce.number().default(7),
    OPENAI_API_KEY: zod_1.z.string().default(""),
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
};
exports.default = config;
