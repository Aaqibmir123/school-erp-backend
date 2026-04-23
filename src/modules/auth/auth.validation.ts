import { z } from "zod";

const phoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\D/g, "").slice(-10))
  .refine((value) => value.length === 10, "Enter a valid 10-digit phone number");

export const checkUserSchema = z.object({
  phone: phoneSchema,
});

export const sendOtpSchema = z.object({
  phone: phoneSchema,
});

export const verifyOtpSchema = z.object({
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter a valid 6-digit OTP"),
  phone: phoneSchema,
});

export const loginSchema = z
  .object({
    email: z.string().trim().optional(),
    password: z.string().min(6, "Password must be at least 6 characters"),
    phone: z.string().trim().optional(),
  })
  .superRefine((value, ctx) => {
    // WHY: The admin web currently uses one field for both email and phone, so
    // we only require an identifier instead of forcing a strict email format.
    if (!value.email && !value.phone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Email or phone is required",
        path: ["email"],
      });
    }
  });

export const setPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  token: z.string().min(10, "Token is required"),
});

export const applySchoolSchema = z.object({
  address: z.string().trim().min(5, "Address is required"),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: phoneSchema,
  principalName: z.string().trim().min(3, "Principal name is required"),
  schoolName: z.string().trim().min(3, "School name is required"),
});

export const firebaseLoginSchema = z.object({
  idToken: z.string().min(10, "idToken required"),
});
