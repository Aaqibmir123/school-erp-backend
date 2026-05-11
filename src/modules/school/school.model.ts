import mongoose from "mongoose";

const schoolSchema = new mongoose.Schema(
  {
    schoolName: {
      type: String,
      required: true,
    },

    principalName: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
    },

    phone: {
      type: String,
      required: true,
    },

    address: {
      type: String,
    },

    /** bcrypt hash set at application time; never returned on normal queries */
    passwordHash: {
      type: String,
      select: false,
    },

    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },
  },
  { timestamps: true }
);

export const School = mongoose.model("School", schoolSchema);