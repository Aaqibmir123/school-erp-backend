import mongoose from "mongoose";

const resultSchema = new mongoose.Schema(
  {
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },

    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
    },

    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
      index: true,
    },

    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
    },

    rollNumberSnapshot: {
      type: Number,
      default: null,
    },

    marksObtained: {
      type: Number,
      required: true,
    },

    totalMarks: {
      type: Number,
      default: 100,
    },

    createdById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
  },
  { timestamps: true },
);

// ✅ prevent duplicate (IMPORTANT)
resultSchema.index(
  { examId: 1, studentId: 1, subjectId: 1, schoolId: 1 },
  { unique: true },
);

resultSchema.index({ schoolId: 1, classId: 1, sectionId: 1, createdAt: -1 });
resultSchema.index({ schoolId: 1, studentId: 1, createdAt: -1 });

export const ResultModel =
  mongoose.models.Result || mongoose.model("Result", resultSchema);
