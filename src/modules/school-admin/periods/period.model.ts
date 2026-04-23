import mongoose from "mongoose";
import { PeriodType } from "../../../../../shared-types/period.types";

const periodSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },

    startTime: {
      type: String,
      required: true,
    },

    endTime: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      enum: Object.values(PeriodType),
      default: PeriodType.CLASS,
    },
  },
  { timestamps: true },
);

// 🔥 ONLY SORT INDEX (NO UNIQUE)
periodSchema.index({ schoolId: 1, startTime: 1 });

export const PeriodModel = mongoose.model("Period", periodSchema);
