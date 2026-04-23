import bcrypt from "bcryptjs";

import {
  ApplySchoolDTO,
  LoginDTO,
} from "../../../../shared-types/auth.types";
import { generateToken, verifyToken } from "../../utils/jwt";
import { ApiError } from "../../utils/apiError";
import { StudentModel } from "../school-admin/student/student.model";
import { TeacherModel } from "../school-admin/teacher/teacher.model";
import { School } from "../school/school.model";
import { User, UserRole } from "../user/user.model";
import admin from "./firebase";
import { OtpModel } from "./otp.model";

type AuthUserResponse = {
  _id: string;
  email?: string;
  isFirstLogin: boolean;
  name?: string;
  phone?: string;
  role: string;
  schoolId?: string;
};

/* ================= NORMALIZE PHONE ================= */
const normalizePhone = (phone: string) => {
  if (!phone) return "";

  return phone.toString().replace(/\D/g, "").slice(-10);
};

const sanitizeAuthUser = (user: any): AuthUserResponse => ({
  _id: user._id.toString(),
  email: user.email || undefined,
  isFirstLogin: Boolean(user.isFirstLogin),
  name: user.name || undefined,
  phone: user.phone || undefined,
  role: user.role,
  schoolId: user.schoolId?.toString?.() || undefined,
});

/* ================= CHECK USER ================= */
export const checkUser = async (phone: string) => {
  const cleanPhone = normalizePhone(phone);

  const user = await User.findOne({ phone: cleanPhone }).select("role");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return {
    role: user.role,
  };
};

/* ================= SEND OTP ================= */
export const sendOtp = async (phone: string) => {
  const normalizedPhone = normalizePhone(phone);

  await OtpModel.deleteMany({ phone: normalizedPhone });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  await OtpModel.create({
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    otp,
    phone: normalizedPhone,
  });

  return { sent: true };
};

/* ================= VERIFY OTP ================= */
export const verifyOtp = async (phone: string, otp: string) => {
  const normalizedPhone = normalizePhone(phone);

  const record = await OtpModel.findOne({ phone: normalizedPhone }).sort({
    createdAt: -1,
  });

  if (!record) {
    throw new ApiError(404, "OTP not found");
  }

  if (record.expiresAt < new Date()) {
    throw new ApiError(400, "OTP expired");
  }

  if (String(record.otp) !== String(otp)) {
    throw new ApiError(400, "Invalid OTP");
  }

  await OtpModel.deleteMany({ phone: normalizedPhone });

  let user = await User.findOne({ phone: normalizedPhone });

  if (!user) {
    user = await User.create({
      phone: normalizedPhone,
      role: UserRole.PARENT,
    });
  }

  return buildAuthResponse(user);
};

/* ================= PASSWORD LOGIN ================= */
export const login = async (data: LoginDTO) => {
  const identifier = data.email?.trim() || normalizePhone(data.phone || "");
  const normalizedIdentifier = identifier.includes("@")
    ? identifier.toLowerCase()
    : identifier;

  const user = await User.findOne({
    $or: [{ email: normalizedIdentifier }, { phone: normalizedIdentifier }],
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (!user.password) {
    throw new ApiError(400, "Password not set");
  }

  const match = await bcrypt.compare(data.password, user.password);

  if (!match) {
    throw new ApiError(401, "Invalid password");
  }

  return buildAuthResponse(user);
};

/* ================= FIREBASE LOGIN ================= */
export const firebaseLoginService = async (idToken: string) => {
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);

    const rawPhone = decoded.phone_number;

    if (!rawPhone) {
      throw new ApiError(400, "Phone not found in token");
    }

    const phone = normalizePhone(rawPhone);

    let user = await User.findOne({ phone });

    if (!user) {
      user = await User.create({
        phone,
        role: UserRole.PARENT,
      });
    }

    return buildAuthResponse(user);
  } catch (error: any) {
    throw new ApiError(400, error.message || "Firebase login failed");
  }
};

/* ================= COMMON AUTH BUILDER ================= */
const buildAuthResponse = async (user: any) => {
  let teacherId: string | null = null;
  let students: any[] = [];

  if (user.role === UserRole.TEACHER) {
    const teacher = await TeacherModel.findOne({ userId: user._id }).select(
      "_id",
    );

    if (teacher) {
      teacherId = teacher._id.toString();
    }
  }

  if (user.role === UserRole.PARENT) {
    students = await StudentModel.find({
      parentPhone: user.phone,
      schoolId: user.schoolId,
    })
      .populate("classId", "name className")
      .populate("sectionId", "name")
      .select("_id firstName lastName classId sectionId")
      .lean();
  }

  const token = generateToken({
    id: user._id.toString(),
    phone: user.phone,
    role: user.role,
    schoolId: user.schoolId?.toString(),
    teacherId,
  });

  return {
    students,
    token,
    user: sanitizeAuthUser(user),
  };
};

/* ================= SET PASSWORD ================= */
export const setPassword = async (token: string, password: string) => {
  const decoded = verifyToken(token) as { id: string };
  const hashed = await bcrypt.hash(password, 10);

  const user = await User.findByIdAndUpdate(
    decoded.id,
    { isFirstLogin: false, password: hashed },
    { new: true },
  );

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return sanitizeAuthUser(user);
};

/* ================= APPLY SCHOOL ================= */
export const applySchool = async (data: ApplySchoolDTO) => {
  const existing = await School.findOne({
    $or: [{ email: data.email }, { phone: data.phone }],
  });

  if (existing) {
    throw new ApiError(409, "Already applied");
  }

  return School.create({
    ...data,
    status: "PENDING",
  });
};
