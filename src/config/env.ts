import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  CLIENT_URLS: z.string().default("http://localhost:3000,http://localhost:8081"),
  EMAIL_PASS: z.string().optional().default(""),
  EMAIL_USER: z.string().optional().default(""),
  FIREBASE_CLIENT_EMAIL: z.string().optional().default(""),
  FIREBASE_CLIENT_ID: z.string().optional().default(""),
  FIREBASE_PRIVATE_KEY: z.string().optional().default(""),
  FIREBASE_PRIVATE_KEY_ID: z.string().optional().default(""),
  FIREBASE_PROJECT_ID: z.string().optional().default(""),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  MONGO_URI: z.string().min(1, "MONGO_URI is required"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().default(5000),
});

const parsedEnv = envSchema.parse(process.env);

export const env = {
  ...parsedEnv,
  // WHY: Keeping the parsed origin list here avoids duplicating split/trim
  // logic anywhere else in the backend configuration.
  clientOrigins: parsedEnv.CLIENT_URLS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
};
