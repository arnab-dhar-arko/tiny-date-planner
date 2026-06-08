import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(8080),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("7d"),
  CORS_ORIGIN: z.string().default("*"),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(14).default(12)
});

export const env = envSchema.parse(process.env);
