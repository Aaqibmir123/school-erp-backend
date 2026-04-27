import mongoose from "mongoose";

export enum UserRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  SCHOOL_ADMIN = "SCHOOL_ADMIN",
  TEACHER = "TEACHER",
  PARENT = "PARENT",
  STUDENT = "STUDENT",
}

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: function (this: any) {
        return this.role === UserRole.SCHOOL_ADMIN;
      },
    },

    email: {
      type: String,
      lowercase: true,
      unique: true,
      sparse: true, // 🔥 IMPORTANT (warna null pe conflict)
      required: function (this: any) {
        return this.role === UserRole.SCHOOL_ADMIN;
      },
    },

    phone: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: Object.values(UserRole),
      required: true,
    },

    password: {
      type: String,
    },

    isFirstLogin: {
      type: Boolean,
      default: true,
    },

    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
    },
  },
  { timestamps: true },
);

/* INDEXES */
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });

export const User = mongoose.model("User", userSchema);
