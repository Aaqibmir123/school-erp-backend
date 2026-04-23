import mongoose, { Document, Schema } from "mongoose";

export interface TeacherDocument extends Document {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;

  gender?: string;
  dateOfBirth?: Date;

  employeeId?: string;

  subjectIds?: mongoose.Types.ObjectId[]; // 🔥 optional

  qualification?: string;
  experience?: number;
  joiningDate?: Date;

  address?: string;
  profileImage?: string;

  schoolId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
}

const TeacherSchema = new Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },

    email: { type: String, required: true, lowercase: true },
    phone: { type: String, required: true },

    gender: String,
    dateOfBirth: Date,

    employeeId: String,

    // 🔥 optional
    subjectIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subject",
      },
    ],

    qualification: String,
    experience: Number,
    joiningDate: Date,

    address: String,
    profileImage: String,

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },

    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
  },
  { timestamps: true },
);

/* INDEXES */

TeacherSchema.index({ schoolId: 1 });
TeacherSchema.index({ email: 1 });
TeacherSchema.index({ subjectIds: 1 });

export const TeacherModel =
  mongoose.models.Teacher ||
  mongoose.model<TeacherDocument>("Teacher", TeacherSchema);
