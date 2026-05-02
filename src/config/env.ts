import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  CLIENT_URLS: z
    .string()
    .default(
      "http://localhost:3000,http://localhost:8081,https://aaqib-school-erp-admin.vercel.app,https://smartschoolerp.co.in,https://www.smartschoolerp.co.in",
    ),
  CLOUDINARY_API_KEY: z.string().optional().default(""),
  CLOUDINARY_API_SECRET: z.string().optional().default(""),
  CLOUDINARY_CLOUD_NAME: z.string().optional().default(""),
  DELETE_ACCOUNT_SUPPORT_EMAIL: z.string().email().optional().default(""),
  EMAIL_PASS: z.string().optional().default(""),
  EMAIL_USER: z.string().optional().default(""),
  FIREBASE_CLIENT_EMAIL: z.string().optional().default(""),
  FIREBASE_CLIENT_ID: z.string().optional().default(""),
  FIREBASE_PRIVATE_KEY: z.string().optional().default(""),
  FIREBASE_PRIVATE_KEY_ID: z.string().optional().default(""),
  FIREBASE_PROJECT_ID: z.string().optional().default(""),
  FIREBASE_SERVICE_ACCOUNT_PATH: z.string().optional().default(""),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  MONGO_URI: z.string().min(1, "MONGO_URI is required"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  OTP_RESEND_SECONDS: z.coerce.number().int().positive().default(60),
  OTP_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  PHONE_AUTH_PROVIDER: z.enum(["firebase"]).default("firebase"),
  PORT: z.coerce.number().default(5000),
  REFRESH_JWT_SECRET: z.string().min(1, "REFRESH_JWT_SECRET is required"),
  REVIEWER_OTP: z.string().optional().default(""),
  REVIEWER_PHONE: z.string().optional().default(""),
  SUPER_ADMIN_PASSWORD: z.string().min(1, "SUPER_ADMIN_PASSWORD is required"),
  SUPER_ADMIN_PHONE: z.string().min(1, "SUPER_ADMIN_PHONE is required"),
  TWO_FACTOR_API_KEY: z.string().min(1, "TWO_FACTOR_API_KEY is required"),
  TWO_FACTOR_BASE_URL: z
    .string()
    .url()
    .default("https://2factor.in/API/V1"),
  WEB_APP_URL: z
    .string()
    .url()
    .optional()
    .or(z.literal(""))
    .default("https://smartschoolerp.co.in"),
});

const parsedEnv = envSchema.parse(process.env);

const cleanSecretValue = (value: string) => value.trim().replace(/;+$/, "");

export const env = {
  ...parsedEnv,
  CLOUDINARY_API_KEY: cleanSecretValue(parsedEnv.CLOUDINARY_API_KEY),
  CLOUDINARY_API_SECRET: cleanSecretValue(parsedEnv.CLOUDINARY_API_SECRET),
  CLOUDINARY_CLOUD_NAME: cleanSecretValue(parsedEnv.CLOUDINARY_CLOUD_NAME),
  DELETE_ACCOUNT_SUPPORT_EMAIL: cleanSecretValue(
    parsedEnv.DELETE_ACCOUNT_SUPPORT_EMAIL,
  ),
  EMAIL_PASS: cleanSecretValue(parsedEnv.EMAIL_PASS),
  EMAIL_USER: cleanSecretValue(parsedEnv.EMAIL_USER),
  FIREBASE_CLIENT_EMAIL: cleanSecretValue(parsedEnv.FIREBASE_CLIENT_EMAIL),
  FIREBASE_CLIENT_ID: cleanSecretValue(parsedEnv.FIREBASE_CLIENT_ID),
  FIREBASE_PRIVATE_KEY: cleanSecretValue(parsedEnv.FIREBASE_PRIVATE_KEY),
  FIREBASE_PRIVATE_KEY_ID: cleanSecretValue(parsedEnv.FIREBASE_PRIVATE_KEY_ID),
  FIREBASE_PROJECT_ID: cleanSecretValue(parsedEnv.FIREBASE_PROJECT_ID),
  REVIEWER_OTP: cleanSecretValue(parsedEnv.REVIEWER_OTP),
  REVIEWER_PHONE: cleanSecretValue(parsedEnv.REVIEWER_PHONE),
  TWO_FACTOR_API_KEY: cleanSecretValue(parsedEnv.TWO_FACTOR_API_KEY),
  clientOrigins: parsedEnv.CLIENT_URLS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
};
