import mongoose, { Schema } from "mongoose";

const scheduleSchema = new Schema(
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

    classId: {
      type: Schema.Types.ObjectId,
      ref: "Class",
      required: true,
      index: true,
    },

    subjectId: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
      index: true,
    },

    // 🔥 FIX: correct position
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
      index: true,
    },

    date: {
      type: Date,
      required: true,
      index: true,
    },

    startTime: {
      type: String,
      required: true,
    },
    sectionId: {
      type: Schema.Types.ObjectId,
      ref: "Section",
      required: true,
      index: true,
    },

    endTime: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

// 🔥 prevent duplicate subject schedule
scheduleSchema.index({ examId: 1, classId: 1, subjectId: 1 }, { unique: true });

// 🔥 fast teacher query
scheduleSchema.index(
  { examId: 1, classId: 1, sectionId: 1, subjectId: 1 },
  { unique: true },
);
export default mongoose.model("Schedule", scheduleSchema);
