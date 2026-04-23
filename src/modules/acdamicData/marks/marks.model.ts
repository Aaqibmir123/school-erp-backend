import mongoose, { Document, Schema } from "mongoose";

export interface IMark extends Document {
  studentId: mongoose.Types.ObjectId;
  examId: mongoose.Types.ObjectId;
  subjectId: mongoose.Types.ObjectId;
  classId: mongoose.Types.ObjectId;
  schoolId: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  marks: number | null;
}

const markSchema = new Schema<IMark>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    examId: { type: Schema.Types.ObjectId, ref: "Exam", required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject", required: true },
    classId: { type: Schema.Types.ObjectId, ref: "Class", required: true },
    schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: "Teacher", required: true },
    marks: { type: Number, min: 0, max: 999 },
  },
  { timestamps: true },
);

// 🔥 UNIQUE INDEX (NO DUPLICATES)
markSchema.index({ studentId: 1, examId: 1, subjectId: 1 }, { unique: true });

// 🔥 FAST QUERY INDEX
markSchema.index({ examId: 1, subjectId: 1, classId: 1 });

export default mongoose.model<IMark>("Mark", markSchema);
