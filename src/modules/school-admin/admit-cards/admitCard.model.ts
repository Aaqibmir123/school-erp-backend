import mongoose, { Schema } from "mongoose";

const admitCardSchema = new Schema(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },

    examId: {
      type: Schema.Types.ObjectId,
      ref: "AcademicExam",
      required: true,
      index: true,
    },

    studentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },

    pdfUrl: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["draft", "released"],
      default: "draft",
      index: true,
    },

    approvalStatus: {
      type: String,
      enum: ["draft", "approved"],
      default: "draft",
      index: true,
    },

    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    releasedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

admitCardSchema.index({ schoolId: 1, examId: 1, studentId: 1 }, { unique: true });

export default mongoose.model("AdmitCard", admitCardSchema);
