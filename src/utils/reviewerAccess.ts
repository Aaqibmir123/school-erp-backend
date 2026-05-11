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
  const school = await School.findOneAndUpdate(
    { phone },
    {
      $set: {
        address: "Reviewer demo access school",
        email: `play-reviewer-${phone}@local.invalid`,
        phone,
        principalName: "Play Store Reviewer",
        schoolName: "Google Play Reviewer Demo School",
        status: "APPROVED",
      },
    },
    { new: true, upsert: true },
  ).lean();

  /* ---------- CLASS ---------- */
  const classDoc = await ClassModel.findOneAndUpdate(
    { schoolId: school._id, name: "Reviewer Class" },
    {
      $set: {
        name: "Reviewer Class",
        order: 1,
        schoolId: school._id,
      },
    },
    { new: true, upsert: true },
  ).lean();

  /* ---------- SECTION ---------- */
  const section = await SectionModel.findOneAndUpdate(
    { classId: classDoc._id, name: "A", schoolId: school._id },
    {
      $set: {
        classId: classDoc._id,
        name: "A",
        order: 1,
        schoolId: school._id,
      },
    },
    { new: true, upsert: true },
  ).lean();

  /* ---------- USER ---------- */
  const user = await User.findOneAndUpdate(
    { phone, role: UserRole.REVIEWER },
    {
      $set: {
        email: `play-reviewer-${phone}@local.invalid`,
        isFirstLogin: false,
        name: "Google Play Reviewer",
        phone,
        role: UserRole.REVIEWER,
        schoolId: school._id,
        status: "active",
      },
    },
    { new: true, upsert: true },
  ).lean();

  /* ---------- TEACHER ---------- */
  const teacher = await TeacherModel.findOneAndUpdate(
    { userId: user._id },
    {
      $set: {
        email: `play-reviewer-${phone}@local.invalid`,
        firstName: "Play",
        lastName: "Reviewer",
        phone,
        schoolId: school._id,
        status: "active",
        userId: user._id,
      },
    },
    { new: true, upsert: true },
  ).lean();

  /* ---------- STUDENT ---------- */
  const student = await StudentModel.findOneAndUpdate(
    { parentUserId: user._id, schoolId: school._id },
    {
      $set: {
        classId: classDoc._id,
        firstName: "Reviewer",
        lastName: "Student",
        parentPhone: phone,
        parentUserId: user._id,
        schoolId: school._id,
        sectionId: section._id,
        status: "active",
      },
    },
    { new: true, upsert: true },
  ).lean();

  return {
    school,
    teacher,
    students: [student].filter(Boolean),
    user,
  };
};
