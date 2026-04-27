import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  CLIENT_URLS: z
    .string()
    .default(
      "http://localhost:3000,http://localhost:8081,https://aaqib-school-erp-admin.vercel.app",
    ),
  EMAIL_PASS: z.string().optional().default(""),
  EMAIL_USER: z.string().optional().default(""),
  FIREBASE_CLIENT_EMAIL: z.string().optional().default(""),
  FIREBASE_CLIENT_ID: z.string().optional().default(""),
  FIREBASE_PRIVATE_KEY: z.string().optional().default(""),
  FIREBASE_PRIVATE_KEY_ID: z.string().optional().default(""),
  FIREBASE_PROJECT_ID: z.string().optional().default(""),
  REFRESH_JWT_SECRET: z.string().optional().default(""),
  WEB_APP_URL: z
    .string()
    .url()
    .optional()
    .or(z.literal(""))
    .default("https://aaqib-school-erp-admin.vercel.app"),
  SUPER_ADMIN_PASSWORD: z.string().min(1, "SUPER_ADMIN_PASSWORD is required"),
  SUPER_ADMIN_PHONE: z.string().min(1, "SUPER_ADMIN_PHONE is required"),
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
