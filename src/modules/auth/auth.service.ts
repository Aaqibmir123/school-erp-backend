import axios from "axios";
import bcrypt from "bcryptjs";
import crypto from "crypto";

import { ApplySchoolDTO, LoginDTO } from "../../../shared-types/auth.types";
import { env } from "../../config/env";
import {
  SUPER_ADMIN_PASSWORD,
  SUPER_ADMIN_PHONE,
} from "../../config/superAdmin";
import { ensureUserRoleAccess } from "../../utils/accountAccess";
import { ApiError } from "../../utils/apiError";
import {
  generateRefreshToken,
  generateToken,
  verifyRefreshToken,
} from "../../utils/jwt";
import { TeacherModel } from "../school-admin/teacher/teacher.model";
import { School } from "../school/school.model";
import { User, UserRole } from "../user/user.model";
import { getFirebaseAdmin } from "./firebase";

/* ================= TYPES ================= */
type AuthUserResponse = {
  _id: string;
  email?: string;
  accessModules?: ("parent" | "teacher")[];
  image?: string;
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
  accessModules:
    String(user.role || "").toUpperCase() === UserRole.REVIEWER
      ? [...REVIEWER_ACCESS_MODULES]
      : undefined,
  email: user.email || undefined,
  isFirstLogin: Boolean(user.isFirstLogin),
  image: user.image || undefined,
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

const ensureActiveAccount = async (user: any) => {
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.status === "disabled") {
    throw new ApiError(403, "Your account is disabled by school admin");
  }

  return ensureUserRoleAccess(user);
};

/* ================= CHECK USER ================= */
export const checkUser = async (phone: string) => {
  const user = await User.findOne({
    phone: { $in: getPhoneVariants(phone) },
  }).select("_id role phone schoolId status");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  await ensureActiveAccount(user);

  return { role: user.role };
};


/* ================= PASSWORD LOGIN ================= */
export const login = async (data: LoginDTO) => {
  const normalizedPhone = normalizePhone(data.phone || "");

  if (!normalizedPhone) {
    throw new ApiError(400, "Phone is required");
  }

  /* 🔥 SAFE SUPER-ADMIN BOOTSTRAP (one-time only) */
  const superAdminCount = await User.countDocuments({
    role: UserRole.SUPER_ADMIN,
  });
  if (superAdminCount === 0) {
    const shouldBootstrap =
      normalizedPhone === SUPER_ADMIN_PHONE &&
      data.password === SUPER_ADMIN_PASSWORD;

    if (!shouldBootstrap) {
      throw new ApiError(401, "Invalid credentials");
    }

    const hashedPassword = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);
    const seededAdmin = await User.create({
      isFirstLogin: false,
      password: hashedPassword,
      phone: SUPER_ADMIN_PHONE,
      role: UserRole.SUPER_ADMIN,
      status: "active",
    });

    return buildAuthResponse(seededAdmin);
  }

  /* 🔹 NORMAL USERS */
  const user = await User.findOne({
    phone: normalizedPhone,
  });

  if (!user) throw new ApiError(404, "User not found");
  if (!user.password) throw new ApiError(400, "Password not set");

  const match = await bcrypt.compare(data.password, user.password);

  if (!match) throw new ApiError(401, "Invalid password");

  await ensureActiveAccount(user);

  return buildAuthResponse(user);
};

const resolveUserFromPhone = async (phoneInput: string) => {
  const phone = normalizeLoginPhone(phoneInput);
  const phoneVariants = getPhoneVariants(phone);

  const teacher = await getTeacherByPhone(phoneVariants);
  const activeStudents = await getActiveStudentsByParentPhone(phoneVariants);

  let user = await User.findOne({
    phone: { $in: phoneVariants },
  });

    const teacher = await TeacherModel.findOne({ phone }).select(
      "_id firstName lastName email phone schoolId profileImage userId status",
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
          status: "active",
        });
      } else if (user.role !== UserRole.TEACHER) {
        user.role = UserRole.TEACHER;
        user.name =
          user.name || `${teacher.firstName} ${teacher.lastName}`.trim();
        user.email = user.email || fallbackEmail;
        user.schoolId = teacher.schoolId;
        user.status = "active";
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
        status: "active",
      });
    }

    await ensureActiveAccount(user);

    return buildAuthResponse(user);
  } catch (error: any) {
    throw new ApiError(400, error.message || "Firebase login failed");
  }

  const record = await OtpModel.findOne({
    phone,
    sessionId,
  }).select(
    "_id attempts expiresAt lastSentAt maxAttempts otpHash provider providerResponse sessionId phone verifiedAt",
  );

  if (!record) {
    throw new ApiError(404, "OTP session not found");
  }

  if (record.verifiedAt) {
    throw new ApiError(410, "OTP already used");
  }

  if (record.expiresAt.getTime() <= Date.now()) {
    throw new ApiError(410, "OTP expired");
  }

  if ((record.attempts || 0) >= (record.maxAttempts || 5)) {
    throw new ApiError(429, "Too many OTP attempts. Please resend OTP.");
  }

  let verified = false;

  if (record.provider === "2factor") {
    verified = await verifyOtpVia2Factor(record.sessionId, otp);
  }

  if (!verified) {
    verified = hashOtpCode(record.sessionId, otp) === record.otpHash;
  }

  const update: Record<string, unknown> = {
    $inc: { attempts: 1 },
  };

  if (verified) {
    update.$set = {
      expiresAt: new Date(),
      verifiedAt: new Date(),
    };
  }

  await OtpModel.findByIdAndUpdate(record._id, update);

  if (!verified) {
    throw new ApiError(401, "Invalid OTP");
  }

  const user = await resolveUserFromPhone(phone);

  return buildAuthResponse(user);
};

/* ================= COMMON AUTH BUILDER ================= */
const buildAuthResponse = async (user: any) => {
  let teacherId: string | null = null;
  let teacherProfileImage: string | undefined;
  let students: any[] = [];
  const baseUser = sanitizeAuthUser(user);
  const access = await ensureActiveAccount(user);

  if ((access as any)?.teacher) {
    teacherId = (access as any).teacher._id.toString();
    teacherProfileImage = normalizeUploadUrl(
      (access as any).teacher.profileImage,
    );
  }

  if (user.role === UserRole.PARENT) {
    students = (access as any)?.students || [];
  }

  const token = generateToken({
    id: user._id.toString(),
    accessModules:
      String(user.role || "").toUpperCase() === UserRole.REVIEWER
        ? [...REVIEWER_ACCESS_MODULES]
        : undefined,
    phone: user.phone,
    role: user.role,
    schoolId: user.schoolId?.toString(),
    teacherId,
    studentId: students[0]?._id?.toString?.(),
  });

  const refreshToken = generateRefreshToken({
    id: user._id.toString(),
    accessModules:
      String(user.role || "").toUpperCase() === UserRole.REVIEWER
        ? [...REVIEWER_ACCESS_MODULES]
        : undefined,
    phone: user.phone,
    role: user.role,
    schoolId: user.schoolId?.toString(),
    teacherId,
    studentId: students[0]?._id?.toString?.(),
    type: "REFRESH",
  });

  return {
    students,
    refreshToken,
    token,
    user: {
      ...baseUser,
      accessModules:
        String(user.role || "").toUpperCase() === UserRole.REVIEWER
          ? [...REVIEWER_ACCESS_MODULES]
          : baseUser.accessModules,
      image: teacherProfileImage || baseUser.image,
    },
  };
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

  await ensureActiveAccount(user);

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

  const passwordHash = await bcrypt.hash(data.password, 10);

  return School.create({
    address: data.address,
    email: data.email,
    passwordHash,
    phone: data.phone,
    principalName: data.principalName,
    schoolName: data.schoolName,
    status: "PENDING",
  });
};


