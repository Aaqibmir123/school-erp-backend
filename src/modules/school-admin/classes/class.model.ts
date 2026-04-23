import mongoose, { Schema, Types } from "mongoose";

export interface ClassDocument {
  schoolId: Types.ObjectId;
  name: string;
  order: number;
}

const classSchema = new Schema<ClassDocument>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    order: {
      type: Number,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

/*
Unique index
prevent duplicate class in school
*/

classSchema.index(
  {
    schoolId: 1,
    name: 1,
  },
  { unique: true },
);

export const ClassModel = mongoose.model<ClassDocument>("Class", classSchema);
