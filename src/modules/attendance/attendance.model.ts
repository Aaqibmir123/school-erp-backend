import mongoose, { Schema } from "mongoose";

const attendanceSchema = new Schema(
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
    classId: {
      type: Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },
    sectionId: {
      type: Schema.Types.ObjectId,
      ref: "Section",
      required: true,
    },
    periodId: {
      type: Schema.Types.ObjectId,
      ref: "Period",
      required: true,
      index: true,
    },
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
      index: true,
    },
    date: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["PRESENT", "ABSENT"],
      default: "ABSENT",
    },
    mode: {
      type: String,
      enum: ["AUTO", "MANUAL"],
      default: "AUTO",
    },
    reason: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true },
);

// 🔥 UNIQUE INDEX (CRITICAL)
attendanceSchema.index(
  {
    schoolId: 1,
    studentId: 1,
    periodId: 1,
    subjectId: 1,
    sectionId: 1,
    date: 1,
  },
  { unique: true },
);

attendanceSchema.index({
  schoolId: 1,
  classId: 1,
  sectionId: 1,
  subjectId: 1,
  date: -1,
});

attendanceSchema.index({
  schoolId: 1,
  studentId: 1,
  date: -1,
});

export const AttendanceModel = mongoose.model("Attendance", attendanceSchema);
