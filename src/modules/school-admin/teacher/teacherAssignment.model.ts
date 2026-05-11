import mongoose, { Schema } from "mongoose";

const teacherAssignmentSchema = new Schema(
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

    classId: {
      type: Schema.Types.ObjectId,
      ref: "Class",
      required: true,
      index: true,
    },

    sectionId: {
      type: Schema.Types.ObjectId,
      ref: "Section",
      default: null,
    },

    subjectId: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
      index: true,
    },

    academicYearId: {
      type: String,
      required: true,
      index: true,
    },

    isClassTeacher: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

/* Prevent duplicate assignment for same teacher */

teacherAssignmentSchema.index(
  {
    teacherId: 1,
    classId: 1,
    sectionId: 1,
    subjectId: 1,
    academicYearId: 1,
  },
  { unique: true },
);

export default mongoose.model("TeacherAssignment", teacherAssignmentSchema);
