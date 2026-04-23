import mongoose, { Schema } from "mongoose";

const subjectSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    classId: {
      type: Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },

    schoolId: {
      type: Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
  },
  { timestamps: true }
);

/* Prevent duplicate subject in same class */

subjectSchema.index(
  { name: 1, classId: 1, schoolId: 1 },
  { unique: true }
);

export const SubjectModel = mongoose.model(
  "Subject",
  subjectSchema
);