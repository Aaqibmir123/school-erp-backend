import mongoose from "mongoose";

const feeSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },

    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },

    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
      index: true,
    },

    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
      index: true,
    },

    academicYearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicYear",
      required: true,
      index: true,
    },

    month: { type: String, required: true },

    totalAmount: { type: Number, required: true },
    paidAmount: { type: Number, required: true, default: 0 },
    remainingAmount: { type: Number, required: true },

    dueDate: { type: Date },

    paidDate: { type: Date },

    description: { type: String },
    feeType: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    feeCategory: {
      type: String,
      enum: ["tuition", "transport", "exam", "fine", "other"],
      required: true,
    },

    status: {
      type: String,
      enum: ["paid", "partial", "unpaid"],
      index: true,
    },
    receiptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Receipt",
      index: true,
    },
  },
  { timestamps: true },
);

feeSchema.pre("save", function () {
  const doc = this as any;

  doc.remainingAmount = doc.totalAmount - doc.paidAmount;

  if (doc.paidAmount === 0) {
    doc.status = "unpaid";
    doc.paidDate = null;
  } else if (doc.paidAmount < doc.totalAmount) {
    doc.status = "partial";
    doc.paidDate = new Date();
  } else {
    doc.status = "paid";
    doc.paidDate = new Date();
  }
});

/* 🔥 UNIQUE INDEX */
feeSchema.index(
  {
    studentId: 1,
    month: 1,
    academicYearId: 1,
    feeType: 1,
  },
  { unique: true },
);

/* 🔥 PERFORMANCE */
feeSchema.index({ classId: 1, sectionId: 1 });
feeSchema.index({ schoolId: 1 });

export default mongoose.model("Fee", feeSchema);
