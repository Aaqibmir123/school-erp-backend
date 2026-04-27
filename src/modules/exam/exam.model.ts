import mongoose from "mongoose";

const examSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      maxlength: 50,
      trim: true,
    },

    examType: {
      type: String,
      enum: [
        "class_test",
        "unit_test",
        "mid_term",
        "final",
        "written",
        "oral",
        "quiz",
      ],
      required: true,
      index: true,
    },

    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },

    createdByRole: {
      type: String,
      enum: ["teacher", "school_admin"],
      lowercase: true,
      required: true,
    },

    createdById: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    /* ================= CLASS ================= */
    classIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Class",
        required: true,
      },
    ],

    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
      required: false,
      index: true,
    },

    /* ================= SUBJECT ================= */
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      default: null,
    },

    chapter: {
      type: String,
      default: "",
      trim: true,
    },

    totalMarks: {
      type: Number,
      required: true,
      min: 1,
    },

    date: {
      type: Date,
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

/* ================= INDEXES ================= */

// 💣 UNIQUE SAFE (NO DUPLICATE EXAMS)
examSchema.index(
  {
    schoolId: 1,
    classIds: 1,
    sectionId: 1,
    subjectId: 1,
    examType: 1,
    date: 1,
  },
  { unique: true },
);

// ⚡ PERFORMANCE
examSchema.index({ classIds: 1, sectionId: 1 });

export default mongoose.model("Exam", examSchema);
