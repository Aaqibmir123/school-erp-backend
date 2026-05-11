import mongoose from "mongoose";

const otpSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, index: true },
    sessionId: { type: String, required: true, unique: true, index: true },
    otpHash: { type: String, required: true, select: false },
    provider: { type: String, default: "2factor" },
    providerResponse: { type: mongoose.Schema.Types.Mixed, default: null },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    verifiedAt: { type: Date, default: null },
    lastSentAt: { type: Date, default: () => new Date() },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

// 🔥 auto delete expired OTP
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OtpModel = mongoose.model("Otp", otpSchema);
