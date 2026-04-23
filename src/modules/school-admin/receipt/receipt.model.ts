import mongoose from "mongoose";

const receiptSchema = new mongoose.Schema(
  {
    receiptNumber: { type: String, required: true, unique: true },

    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: "School" },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },

    feeIds: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Fee", required: true },
    ],

    totalAmount: Number,
    paidAmount: Number,

    paymentMethod: {
      type: String,
      enum: ["cash", "upi", "online"],
      default: "cash",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    pdfUrl: String,
  },
  { timestamps: true },
);

/* 🔥 INDEXES */
receiptSchema.index({ studentId: 1 });
receiptSchema.index({ receiptNumber: 1 }, { unique: true });
receiptSchema.index({ createdAt: -1 });

export default mongoose.model("Receipt", receiptSchema);
