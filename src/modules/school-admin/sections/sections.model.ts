import mongoose from "mongoose";

const sectionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    order: {
      type: Number,
      required: true,
    },

    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
      index: true,
    },

    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

/* prevent duplicate section */

sectionSchema.index(
  { name: 1, classId: 1, schoolId: 1 },
  { unique: true }
);

export const SectionModel = mongoose.model(
  "Section",
  sectionSchema
);