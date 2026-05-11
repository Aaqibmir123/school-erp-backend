import { z } from "zod";

const phoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\D/g, "").slice(-10))
  .refine((value) => value.length === 10, "Enter a valid 10-digit phone number");

export const createDeleteAccountRequestSchema = z.object({
  fullName: z.string().trim().min(3, "Full name is required"),
  registeredPhoneNumber: phoneSchema,
  schoolName: z.string().trim().min(3, "School name is required"),
  role: z.enum(["Parent", "Teacher", "Student", "Staff", "Other"]),
  reason: z.string().trim().min(10, "Please share a short reason"),
});
