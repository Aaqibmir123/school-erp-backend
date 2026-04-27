import mongoose, { Document, Schema } from "mongoose";

export interface ISchoolProfile extends Document {
  schoolId: mongoose.Types.ObjectId;
  name: string;
  address?: string;
  logo?: string;
  signature?: string;
  seal?: string;
  checkInOpenTime?: string;
  schoolStartTime?: string;
  lateMarkAfterTime?: string;
  checkInCloseTime?: string;
  schoolEndTime?: string;
  checkOutCloseTime?: string;
  workingDays?: string[];
}

const schoolProfileSchema = new Schema<ISchoolProfile>(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      unique: true, // 🔥 IMPORTANT (one profile per school)
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    address: {
      type: String,
      default: "",
      trim: true,
    },

    logo: {
      type: String,
      default: "",
    },

    signature: {
      type: String,
      default: "",
    },

    seal: {
      type: String,
      default: "",
    },

    checkInOpenTime: {
      type: String,
      default: "",
    },

    schoolStartTime: {
      type: String,
      default: "",
    },

    lateMarkAfterTime: {
      type: String,
      default: "",
    },

    checkInCloseTime: {
      type: String,
      default: "",
    },

    schoolEndTime: {
      type: String,
      default: "",
    },

    checkOutCloseTime: {
      type: String,
      default: "",
    },

    workingDays: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

// 🔥 Ensure index created
schoolProfileSchema.index({ schoolId: 1 }, { unique: true });

export const SchoolProfile =
  mongoose.models.SchoolProfile ||
  mongoose.model<ISchoolProfile>("SchoolProfile", schoolProfileSchema);
