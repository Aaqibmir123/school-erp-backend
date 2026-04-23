import mongoose, { Schema } from "mongoose";

const homeworkCheckSchema = new Schema(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    studentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },

    homeworkId: {
      type: Schema.Types.ObjectId,
      ref: "Homework",
      required: true,
      index: true,
    },
    sectionId: {
      type: Schema.Types.ObjectId,
      required: false,
      index: true,
    },

    classId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    subjectId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    // 🔥 MAIN STATUS
    status: {
      type: String,
      enum: ["DONE", "NOT_DONE"],
      default: "NOT_DONE",
    },

    // 🔥 NEW: MARKS
    marks: {
      type: Number,
      default: 0,
      min: 0,
    },

    // 🔥 NEW: FEEDBACK
    feedback: {
      type: String,
      default: "",
      trim: true,
    },

    // 🔥 OPTIONAL: checked by (future proof)
    checkedBy: {
      type: Schema.Types.ObjectId,
      ref: "Teacher",
    },
  },
  { timestamps: true },
);

// 🔥 UNIQUE INDEX (VERY IMPORTANT)
homeworkCheckSchema.index({ studentId: 1, homeworkId: 1 }, { unique: true });

// 🔥 EXTRA INDEXES (PERFORMANCE BOOST)
homeworkCheckSchema.index({ homeworkId: 1 });
homeworkCheckSchema.index({ classId: 1, subjectId: 1 });

export default mongoose.model("HomeworkCheck", homeworkCheckSchema);
