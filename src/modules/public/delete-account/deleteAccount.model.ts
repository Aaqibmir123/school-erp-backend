import mongoose from "mongoose";

export enum DeleteAccountRequestStatus {
  PENDING = "PENDING",
  REVIEWED = "REVIEWED",
}

const deleteAccountRequestSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    registeredPhoneNumber: {
      type: String,
      required: true,
      index: true,
    },
    schoolName: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      required: true,
      trim: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(DeleteAccountRequestStatus),
      default: DeleteAccountRequestStatus.PENDING,
      index: true,
    },
    source: {
      type: String,
      default: "web",
      trim: true,
    },
    userAgent: {
      type: String,
      default: "",
      trim: true,
    },
    ipAddress: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true },
);

deleteAccountRequestSchema.index(
  { registeredPhoneNumber: 1, createdAt: -1 },
  { name: "delete_account_phone_created_idx" },
);

export const DeleteAccountRequest = mongoose.model(
  "DeleteAccountRequest",
  deleteAccountRequestSchema,
);
