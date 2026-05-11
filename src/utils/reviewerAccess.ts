import { env } from "../config/env";
import { ClassModel } from "../modules/school-admin/classes/class.model";
import { SectionModel } from "../modules/school-admin/sections/sections.model";
import { StudentModel } from "../modules/school-admin/student/student.model";
import { TeacherModel } from "../modules/school-admin/teacher/teacher.model";
import { School } from "../modules/school/school.model";
import { User, UserRole } from "../modules/user/user.model";

/* ================= NORMALIZE ================= */
const normalizePhone = (phone: string) =>
  String(phone || "")
    .replace(/\D/g, "")
    .slice(-10);

/* ================= FIXED REVIEWER CREDS ================= */
const FIXED_REVIEWER_PHONE = "9999999999";
const FIXED_REVIEWER_OTP = "123456";

const getReviewerPhone = () => normalizePhone(FIXED_REVIEWER_PHONE);

const getReviewerOtp = () => FIXED_REVIEWER_OTP;

const saveOrReuse = async <T extends { save?: () => Promise<T>; _id?: any }>(
  finder: () => Promise<T | null>,
  create: () => Promise<T>,
) => {
  const found = await finder();
  if (found) {
    return found;
  }

  try {
    return await create();
  } catch (error: any) {
    if (error?.code === 11000) {
      const retry = await finder();
      if (retry) {
        return retry;
      }
    }

    throw error;
  }
};

/* ================= CONFIG ================= */
export const REVIEWER_ACCESS_MODULES = ["parent", "teacher"] as const;

/* ================= CHECKS ================= */
export const isReviewerConfigured = () =>
  env.ENABLE_REVIEWER_LOGIN === true;

export const isReviewerPhone = (phone: string) => {
  const clean = normalizePhone(phone);
  return isReviewerConfigured() && clean === getReviewerPhone();
};

export const isReviewerOtp = (otp: string) =>
  isReviewerConfigured() && String(otp || "").trim() === getReviewerOtp();

/* ================= MAIN CONTEXT ================= */
export const ensureReviewerAccessContext = async (phoneInput?: string) => {
  const phone = normalizePhone(phoneInput || getReviewerPhone());

  if (!isReviewerPhone(phone)) {
    throw new Error("Reviewer access is not configured");
  }

  // #region agent log
  void fetch("http://127.0.0.1:7878/ingest/404de2f9-5f5d-4a49-aafe-3e44b6c75caa", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "686f1a",
    },
    body: JSON.stringify({
      sessionId: "686f1a",
      runId: "pre-fix",
      hypothesisId: "A",
      location: "utils/reviewerAccess.ts:ensureReviewerAccessContext:entry",
      message: "ensureReviewerAccessContext entry",
      data: { phone },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion agent log

  /* ---------- SCHOOL ---------- */
  const reviewerEmail = `play-reviewer-${phone}@local.invalid`;

  const school = await saveOrReuse(
    async () => School.findOne({ phone }).lean(),
    async () =>
      School.create({
        address: "Reviewer demo access school",
        email: reviewerEmail,
        phone,
        principalName: "Play Store Reviewer",
        schoolName: "Google Play Reviewer Demo School",
        status: "APPROVED",
      }),
  );

  /* ---------- CLASS ---------- */
  const classDoc = await saveOrReuse(
    async () =>
      ClassModel.findOne({
        schoolId: school._id,
        name: "Reviewer Class",
      }).lean(),
    async () =>
      ClassModel.create({
        name: "Reviewer Class",
        order: 1,
        schoolId: school._id,
      }),
  );

  /* ---------- SECTION ---------- */
  const section = await saveOrReuse(
    async () =>
      SectionModel.findOne({
        classId: classDoc._id,
        name: "A",
        schoolId: school._id,
      }).lean(),
    async () =>
      SectionModel.create({
        classId: classDoc._id,
        name: "A",
        order: 1,
        schoolId: school._id,
      }),
  );

  /* ---------- USER ---------- */
  const reviewerEmail = `play-reviewer-${phone}@local.invalid`;
  const user = await saveOrReuse(
    async () =>
      User.findOne({
        role: UserRole.REVIEWER,
        $or: [{ phone }, { email: reviewerEmail }],
      }).lean(),
    async () =>
      User.create({
        email: reviewerEmail,
        isFirstLogin: false,
        name: "Google Play Reviewer",
        phone,
        role: UserRole.REVIEWER,
        schoolId: school._id,
        status: "active",
      }),
  );

  /* ---------- TEACHER ---------- */
  const teacher = await saveOrReuse(
    async () =>
      TeacherModel.findOne({
        schoolId: school._id,
        $or: [{ phone }, { email: reviewerEmail }, { userId: user._id }],
      }).lean(),
    async () =>
      TeacherModel.create({
        email: reviewerEmail,
        firstName: "Play",
        lastName: "Reviewer",
        phone,
        schoolId: school._id,
        status: "active",
        userId: user._id,
      }),
  );

  /* ---------- STUDENT ---------- */
  const student = await saveOrReuse(
    async () =>
      StudentModel.findOne({
        schoolId: school._id,
        $or: [{ parentPhone: phone }, { parentUserId: user._id }],
      }).lean(),
    async () =>
      StudentModel.create({
        classId: classDoc._id,
        firstName: "Reviewer",
        lastName: "Student",
        parentPhone: phone,
        parentUserId: user._id,
        schoolId: school._id,
        sectionId: section._id,
        status: "active",
      }),
  );

  return {
    school,
    teacher,
    students: [student].filter(Boolean),
    user,
  };
};
