import mongoose, { Schema } from "mongoose";

const examAttendanceSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    examId: { type: Schema.Types.ObjectId, required: true },
    subjectId: { type: Schema.Types.ObjectId, required: true },
    schoolId: { type: Schema.Types.ObjectId, required: true },
    teacherId: { type: Schema.Types.ObjectId, required: true },
    status: {
      type: String,
      enum: ["present", "absent"],
      required: true,
    },
  },
  { timestamps: true },
);

// 🔥 unique index
examAttendanceSchema.index(
  { studentId: 1, examId: 1, subjectId: 1 },
  { unique: true },
);

export default mongoose.models.ExamAttendance ||
  mongoose.model("ExamAttendance", examAttendanceSchema);
