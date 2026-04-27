import mongoose, { Schema } from "mongoose";

const academicExamSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    examType: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    academicYearId: {
      type: Schema.Types.ObjectId,
      ref: "AcademicYear",
      required: true,
      index: true,
    },

    schoolId: {
      type: Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },

    totalMarks: {
      type: Number,
      required: true,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    isPublished: {
      type: Boolean,
      default: false,
      index: true,
    },

    createdById: {
      type: Schema.Types.ObjectId,
      required: true,
    },
  },
  { timestamps: true },
);

academicExamSchema.index({ schoolId: 1, academicYearId: 1, isPublished: 1 });

export default mongoose.model("AcademicExam", academicExamSchema);
