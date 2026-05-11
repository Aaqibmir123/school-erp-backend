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
import {
  REVIEWER_ACCESS_MODULES,
  ensureReviewerAccessContext,
  isReviewerOtp,
  isReviewerPhone,
} from "../../utils/reviewerAccess";
import { StudentModel } from "../school-admin/student/student.model";
import { TeacherModel } from "../school-admin/teacher/teacher.model";
import { School } from "../school/school.model";
import { User, UserRole } from "../user/user.model";
import { OtpModel } from "./otp.model";
import {
  generateOtpCode,
  hashOtpCode,
  sendOtpVia2Factor,
  verifyOtpVia2Factor,
} from "./twoFactor";

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

const ensureReviewerAccount = async (phoneInput?: string) => {
  return ensureReviewerAccessContext(phoneInput || env.REVIEWER_PHONE);
};

const isReviewerRequest = (phoneInput: string) => isReviewerPhone(phoneInput);

const normalizeLoginPhone = (phone: string) => {
  const normalized = normalizePhone(phone);

  if (!/^[6-9]\d{9}$/.test(normalized)) {
    throw new ApiError(400, "Enter a valid Indian mobile number");
  }

  return normalized;
};

const getTeacherByPhone = async (phoneVariants: string[]) => {
  return TeacherModel.findOne({
    phone: { $in: phoneVariants },
    status: "active",
  }).select(
    "_id firstName lastName email phone schoolId profileImage userId status",
  );
};

const getActiveStudentsByParentPhone = async (phoneVariants: string[]) => {
  return StudentModel.find({
    parentPhone: { $in: phoneVariants },
    status: "active",
  })
    .select("_id schoolId parentUserId firstName lastName rollNumber")
    .lean();
};

const syncTeacherLoginUser = async (
  teacher: any,
  phone: string,
  phoneVariants: string[],
) => {
  const fallbackEmail = teacher.email || buildFallbackEmail(phone);
  const fullName = `${teacher.firstName} ${teacher.lastName}`.trim();

  let user = teacher.userId ? await User.findById(teacher.userId) : null;

  if (!user) {
    user = await User.findOne({
      phone: { $in: phoneVariants },
    });
  }

  if (!user) {
    user = await User.create({
      name: fullName,
      email: fallbackEmail,
      phone,
      role: UserRole.TEACHER,
      schoolId: teacher.schoolId,
      status: "active",
    });
  } else {
    user.name = fullName || user.name;
    user.email = user.email || fallbackEmail;
    user.phone = phone;
    user.role = UserRole.TEACHER;
    user.schoolId = teacher.schoolId || user.schoolId;
    user.status = "active";
    await user.save();
  }

  if (!teacher.userId || teacher.userId.toString() !== user._id.toString()) {
    await TeacherModel.findByIdAndUpdate(teacher._id, {
      userId: user._id,
    });
  }

  return user;
};

const syncParentLoginUser = async (
  phone: string,
  activeStudents: any[],
  existingUser: any,
) => {
  const schoolId = activeStudents[0]?.schoolId || existingUser?.schoolId;
  const fallbackEmail = `${phone}@parent.local`;

  let user = existingUser;

  if (!user) {
    user = await User.create({
      name: `Parent ${phone}`,
      email: fallbackEmail,
      phone,
      role: UserRole.PARENT,
      schoolId,
      status: "active",
    });
  } else {
    user.name = user.name || `Parent ${phone}`;
    user.email = user.email || fallbackEmail;
    user.phone = phone;
    user.role = UserRole.PARENT;
    user.schoolId = schoolId || user.schoolId;
    user.status = "active";
    await user.save();
  }

  await Promise.all(
    activeStudents.map((student: any) =>
      student.parentUserId &&
      student.parentUserId.toString() === user._id.toString()
        ? Promise.resolve()
        : StudentModel.findByIdAndUpdate(student._id, {
            parentUserId: user._id,
          }),
    ),
  );

  return user;
};

/* ================= CHECK USER ================= */
export const checkUser = async (phone: string) => {
  if (isReviewerRequest(phone)) {
    return {
      accessModules: [...REVIEWER_ACCESS_MODULES],
      role: UserRole.REVIEWER,
    };
  }

  const user = await resolveUserFromPhone(phone);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  await ensureActiveAccount(user);

  return { role: user.role };
};

/* ================= SEND OTP ================= */
export const sendOtp = async (phoneInput: string) => {
  const phone = normalizeLoginPhone(phoneInput);

  if (isReviewerRequest(phone)) {
    const recentOtp = await OtpModel.findOne({
      phone,
      verifiedAt: null,
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .select("lastSentAt expiresAt");

    if (recentOtp) {
      const resendAfterMs = Number(env.OTP_RESEND_SECONDS || 60) * 1000;
      const lastSentAt = recentOtp.lastSentAt?.getTime?.() || 0;
      const elapsed = Date.now() - lastSentAt;

      if (elapsed < resendAfterMs) {
        const waitSeconds = Math.ceil((resendAfterMs - elapsed) / 1000);
        throw new ApiError(
          429,
          `Please wait ${waitSeconds} seconds before requesting another OTP`,
        );
      }
    }

    const sessionId = crypto.randomUUID();
    const expiresInSeconds = Number(env.OTP_TTL_SECONDS || 300);
    const maxAttempts = Number(env.OTP_MAX_ATTEMPTS || 5);
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    await OtpModel.updateMany(
      {
        phone,
        verifiedAt: null,
        expiresAt: { $gt: new Date() },
      },
      {
        $set: {
          expiresAt: new Date(),
        },
      },
    );

    await OtpModel.create({
      attempts: 0,
      expiresAt,
      lastSentAt: new Date(),
      maxAttempts,
      otpHash: hashOtpCode(sessionId, "123456"),
      phone,
      provider: "reviewer",
      providerResponse: {
        reviewer: true,
        sent: false,
      },
      sessionId,
    });

    return {
      expiresInSeconds,
      phone,
      resendAfterSeconds: Number(env.OTP_RESEND_SECONDS || 60),
      sessionId,
    };
  }

  await resolveUserFromPhone(phone);

  const recentOtp = await OtpModel.findOne({
    phone,
    verifiedAt: null,
    expiresAt: { $gt: new Date() },
  })
    .sort({ createdAt: -1 })
    .select("lastSentAt expiresAt");

  if (recentOtp) {
    const resendAfterMs = Number(env.OTP_RESEND_SECONDS || 60) * 1000;
    const lastSentAt = recentOtp.lastSentAt?.getTime?.() || 0;
    const elapsed = Date.now() - lastSentAt;

    if (elapsed < resendAfterMs) {
      const waitSeconds = Math.ceil((resendAfterMs - elapsed) / 1000);
      throw new ApiError(
        429,
        `Please wait ${waitSeconds} seconds before requesting another OTP`,
      );
    }
  }

  const otp = generateOtpCode();
  const { providerResponse, providerSessionId } = await sendOtpVia2Factor(
    phone,
    otp,
  );

  const sessionId = providerSessionId || crypto.randomUUID();
  const expiresInSeconds = Number(env.OTP_TTL_SECONDS || 300);
  const maxAttempts = Number(env.OTP_MAX_ATTEMPTS || 5);
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

  await OtpModel.updateMany(
    {
      phone,
      verifiedAt: null,
      expiresAt: { $gt: new Date() },
    },
    {
      $set: {
        expiresAt: new Date(),
      },
    },
  );

  await OtpModel.create({
    attempts: 0,
    expiresAt,
    lastSentAt: new Date(),
    maxAttempts,
    otpHash: hashOtpCode(sessionId, otp),
    phone,
    provider: "2factor",
    providerResponse,
    sessionId,
  });

  return {
    expiresInSeconds,
    phone,
    resendAfterSeconds: Number(env.OTP_RESEND_SECONDS || 60),
    sessionId,
  };
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

  if (user.role === UserRole.SCHOOL_ADMIN && user.schoolId) {
    const school = await School.findById(user.schoolId).select("status").lean();
    if (!school || school.status !== "APPROVED") {
      throw new ApiError(
        403,
        "Your school account is not approved yet. Please wait for admin approval.",
      );
    }
  }

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

  if (teacher) {
    if (teacher.status !== "active") {
      throw new ApiError(404, "User not found");
    }

    user = await syncTeacherLoginUser(teacher, phone, phoneVariants);
  } else if (user?.role === UserRole.PARENT || activeStudents.length) {
    user = await syncParentLoginUser(phone, activeStudents, user);
  } else if (user) {
    throw new ApiError(404, "User not found");
  }

  await ensureActiveAccount(user);

  return user;
};

/* ================= VERIFY OTP ================= */
export const verifyOtp = async (
  phoneInput: string,
  otpInput: string,
  sessionId: string,
) => {
  const phone = normalizeLoginPhone(phoneInput);
  const otp = String(otpInput || "").trim();

  if (!/^\d{6}$/.test(otp)) {
    throw new ApiError(400, "Enter a valid 6-digit OTP");
  }

  if (isReviewerRequest(phone)) {
    if (!isReviewerOtp(otp)) {
      throw new ApiError(401, "Invalid OTP");
    }

    let reviewerRecord = await OtpModel.findOne({
      phone,
      sessionId,
    }).select(
      "_id attempts expiresAt lastSentAt maxAttempts otpHash provider providerResponse sessionId phone verifiedAt",
    );

    if (!reviewerRecord) {
      reviewerRecord = await OtpModel.create({
        attempts: 0,
        expiresAt: new Date(
          Date.now() + Number(env.OTP_TTL_SECONDS || 300) * 1000,
        ),
        lastSentAt: new Date(),
        maxAttempts: Number(env.OTP_MAX_ATTEMPTS || 5),
        otpHash: hashOtpCode(sessionId, otp),
        phone,
        provider: "reviewer",
        providerResponse: {
          reviewer: true,
          sent: false,
        },
        sessionId,
        verifiedAt: null,
      });
    }

    if (reviewerRecord.verifiedAt) {
      throw new ApiError(410, "OTP already used");
    }

    if (reviewerRecord.expiresAt.getTime() <= Date.now()) {
      throw new ApiError(410, "OTP expired");
    }

    if ((reviewerRecord.attempts || 0) >= (reviewerRecord.maxAttempts || 5)) {
      throw new ApiError(429, "Too many OTP attempts. Please resend OTP.");
    }

    await OtpModel.findByIdAndUpdate(reviewerRecord._id, {
      $inc: { attempts: 1 },
      $set: {
        expiresAt: new Date(),
        verifiedAt: new Date(),
      },
    });

    const reviewer = await ensureReviewerAccount(phone);
    return buildAuthResponse(reviewer.user);
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

  if ((access as any)?.students) {
    students = (access as any).students || [];
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
