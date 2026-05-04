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
  otp: z.string().trim().regex(/^\d{6}$/, "Enter a valid 6-digit OTP"),
  phone: phoneSchema,
  sessionId: z.string().trim().min(6, "Session ID is required"),
});

export const loginSchema = z
  .object({
    email: z.string().trim().optional(),
    password: z.string().min(6, "Password must be at least 6 characters"),
    phone: z.string().trim().optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.email && !value.phone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Email or phone is required",
        path: ["email"],
      });
    }
  });

export const applySchoolSchema = z
  .object({
    address: z.string().trim().min(5, "Address is required"),
    email: z.string().trim().email("Enter a valid email"),
    confirmPassword: z
      .string()
      .min(8, "Confirm password must be at least 8 characters"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    phone: phoneSchema,
    principalName: z.string().trim().min(3, "Principal name is required"),
    schoolName: z.string().trim().min(3, "School name is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .transform(({ confirmPassword: _confirm, password, ...rest }) => ({
    ...rest,
    password,
  }));
