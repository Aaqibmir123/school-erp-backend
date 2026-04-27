import bcrypt from "bcryptjs";

import { ApplySchoolDTO, LoginDTO } from "../../../../shared-types/auth.types";
import {
  SUPER_ADMIN_PASSWORD,
  SUPER_ADMIN_PHONE,
} from "../../config/superAdmin";
import { ApiError } from "../../utils/apiError";
import {
  generateRefreshToken,
  generateToken,
  verifyRefreshToken,
  verifyToken,
} from "../../utils/jwt";
import { StudentModel } from "../school-admin/student/student.model";
import { TeacherModel } from "../school-admin/teacher/teacher.model";
import { School } from "../school/school.model";
import { User, UserRole } from "../user/user.model";
import { getFirebaseAdmin } from "./firebase";
import { OtpModel } from "./otp.model";

/* ================= TYPES ================= */
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

const getPhoneVariants = (phone: string) => {
  const digits = phone.toString().replace(/\D/g, "");
  const normalized = normalizePhone(phone);

  return Array.from(
    new Set(
      [digits, normalized, `0${normalized}`].filter(
        (value) => Boolean(value) && value.length > 0,
      ),
    ),
  );
};

const buildFallbackEmail = (phone: string) =>
  `${normalizePhone(phone)}@teacher.local`;

const sanitizeAuthUser = (user: any): AuthUserResponse => ({
  _id: user._id.toString(),
  email: user.email || undefined,
  isFirstLogin: Boolean(user.isFirstLogin),
  name: user.name || undefined,
  phone: user.phone || undefined,
  role: user.role,
  schoolId: user.schoolId?.toString?.() || undefined,
});

const normalizeUploadUrl = (filePath?: string | null) => {
  if (!filePath) return undefined;

  if (/^https?:\/\//i.test(filePath)) {
    return filePath;
  }

  const uploadsIndex = filePath.lastIndexOf("uploads");

  if (uploadsIndex === -1) {
    return filePath.replace(/\\/g, "/");
  }

  return `/${filePath.slice(uploadsIndex).replace(/\\/g, "/")}`;
};

/* ================= CHECK USER ================= */
export const checkUser = async (phone: string) => {
  const user = await User.findOne({
    phone: { $in: getPhoneVariants(phone) },
  }).select("role");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return { role: user.role };
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

  if (!record) throw new ApiError(404, "OTP not found");
  if (record.expiresAt < new Date()) throw new ApiError(400, "OTP expired");
  if (String(record.otp) !== String(otp))
    throw new ApiError(400, "Invalid OTP");

  await OtpModel.deleteMany({ phone: normalizedPhone });

  let user = await User.findOne({
    phone: { $in: getPhoneVariants(normalizedPhone) },
  });

  if (!user) {
    user = await User.create({
      name: `Parent ${normalizedPhone}`,
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

  /* 🔥 SUPER ADMIN LOGIN FLOW */
  if (normalizedIdentifier === SUPER_ADMIN_PHONE) {
    let superAdmin = await User.findOne({ phone: SUPER_ADMIN_PHONE });

    // 👉 Create if not exists
    if (!superAdmin) {
      const hashedPassword = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);

      superAdmin = await User.create({
        phone: SUPER_ADMIN_PHONE,
        password: hashedPassword,
        role: UserRole.SUPER_ADMIN,
        isFirstLogin: false,
      });
    }

    const match = await bcrypt.compare(
      data.password,
      superAdmin.password || "",
    );

    if (!match) {
      throw new ApiError(401, "Invalid password");
    }

    return buildAuthResponse(superAdmin);
  }

  /* 🔹 NORMAL USERS */
  const user = await User.findOne({
    $or: [{ email: normalizedIdentifier }, { phone: normalizedIdentifier }],
  });

  if (!user) throw new ApiError(404, "User not found");
  if (!user.password) throw new ApiError(400, "Password not set");

  const match = await bcrypt.compare(data.password, user.password);

  if (!match) throw new ApiError(401, "Invalid password");

  return buildAuthResponse(user);
};

/* ================= FIREBASE LOGIN ================= */
export const firebaseLoginService = async (idToken: string) => {
  try {
    const admin = getFirebaseAdmin();
    const decoded = await admin.auth().verifyIdToken(idToken);

    const rawPhone = decoded.phone_number;
    if (!rawPhone) throw new ApiError(400, "Phone not found in token");

    const phone = normalizePhone(rawPhone);

    const teacher = await TeacherModel.findOne({ phone }).select(
      "_id firstName lastName email phone schoolId profileImage userId",
    );

    let user = await User.findOne({ phone });

    if (teacher) {
      const fallbackEmail = teacher.email || buildFallbackEmail(phone);

      if (!user) {
        user = await User.create({
          name: `${teacher.firstName} ${teacher.lastName}`.trim(),
          email: fallbackEmail,
          phone,
          role: UserRole.TEACHER,
          schoolId: teacher.schoolId,
        });
      } else if (user.role !== UserRole.TEACHER) {
        user.role = UserRole.TEACHER;
        user.name =
          user.name || `${teacher.firstName} ${teacher.lastName}`.trim();
        user.email = user.email || fallbackEmail;
        user.schoolId = teacher.schoolId;
        await user.save();
      }

      if (
        !teacher.userId ||
        teacher.userId.toString() !== user._id.toString()
      ) {
        await TeacherModel.findByIdAndUpdate(teacher._id, {
          userId: user._id,
        });
      }
    } else if (!user) {
      user = await User.create({
        name: `Parent ${phone}`,
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
  let teacherProfileImage: string | undefined;
  let students: any[] = [];
  const baseUser = sanitizeAuthUser(user);

  if (user.role === UserRole.TEACHER) {
    const teacher =
      (await TeacherModel.findOne({ userId: user._id }).select(
        "_id profileImage",
      )) ||
      (await TeacherModel.findOne({
        phone: user.phone,
        schoolId: user.schoolId,
      }).select("_id profileImage userId"));

    if (teacher) {
      teacherId = teacher._id.toString();
      teacherProfileImage = normalizeUploadUrl(teacher.profileImage);

      if (
        !teacher.userId ||
        teacher.userId.toString() !== user._id.toString()
      ) {
        await TeacherModel.findByIdAndUpdate(teacher._id, {
          userId: user._id,
        });
      }
    }
  }

  if (user.role === UserRole.PARENT) {
    students = await StudentModel.find({
      parentPhone: { $in: getPhoneVariants(user.phone || "") },
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

  const refreshToken = generateRefreshToken({
    id: user._id.toString(),
    phone: user.phone,
    role: user.role,
    schoolId: user.schoolId?.toString(),
    teacherId,
    type: "REFRESH",
  });

  return {
    students,
    refreshToken,
    token,
    user: {
      ...baseUser,
      image: teacherProfileImage || baseUser.image,
    },
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

  if (!user) throw new ApiError(404, "User not found");

  return sanitizeAuthUser(user);
};

/* ================= REFRESH SESSION ================= */
export const refreshSession = async (refreshToken: string) => {
  const decoded = verifyRefreshToken(refreshToken) as {
    id?: string;
    type?: string;
  };

  if (decoded.type !== "REFRESH" || !decoded.id) {
    throw new ApiError(401, "Invalid refresh token");
  }

  const user = await User.findById(decoded.id);
  if (!user) throw new ApiError(404, "User not found");

  return buildAuthResponse(user);
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
