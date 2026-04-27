import mongoose, { Document, Schema } from "mongoose";

export interface IMark extends Document {
  studentId: mongoose.Types.ObjectId;
  examId: mongoose.Types.ObjectId;
  subjectId: mongoose.Types.ObjectId;
  classId: mongoose.Types.ObjectId;
  sectionId?: mongoose.Types.ObjectId | null;
  schoolId: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  marks: number | null;
  rollNumberSnapshot?: number | null;
}

const markSchema = new Schema<IMark>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    examId: { type: Schema.Types.ObjectId, ref: "Exam", required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject", required: true },
    classId: { type: Schema.Types.ObjectId, ref: "Class", required: true },
    sectionId: { type: Schema.Types.ObjectId, ref: "Section", default: null },
    schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: "Teacher", required: true },
    marks: { type: Number, min: 0, max: 999 },
    rollNumberSnapshot: { type: Number, default: null },
  },
  { timestamps: true },
);

// 🔥 UNIQUE INDEX (NO DUPLICATES)
markSchema.index({ studentId: 1, examId: 1, subjectId: 1 }, { unique: true });

// 🔥 FAST QUERY INDEX
markSchema.index({ examId: 1, subjectId: 1, classId: 1 });

markSchema.index({
  schoolId: 1,
  classId: 1,
  sectionId: 1,
  subjectId: 1,
  createdAt: -1,
});
markSchema.index({ schoolId: 1, studentId: 1, createdAt: -1 });

export default mongoose.model<IMark>("Mark", markSchema);
