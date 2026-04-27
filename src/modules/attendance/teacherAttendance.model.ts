import mongoose, { Schema } from "mongoose";

const teacherAttendanceSchema = new Schema(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
      index: true,
    },
    date: {
      type: String,
      required: true,
      index: true,
    },
    checkInAt: {
      type: Date,
      default: null,
    },
    checkOutAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["PENDING", "PRESENT", "LATE", "CHECKED_OUT", "LEAVE", "HALF_DAY"],
      default: "PENDING",
      index: true,
    },
    note: {
      type: String,
      default: "",
      trim: true,
    },
    markedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

teacherAttendanceSchema.index(
  { schoolId: 1, teacherId: 1, date: 1 },
  { unique: true },
);

export default mongoose.models.TeacherAttendance ||
  mongoose.model("TeacherAttendance", teacherAttendanceSchema);
