import { School } from "../../school/school.model";
import { User, UserRole } from "../../user/user.model";
import { TeacherModel } from "../../school-admin/teacher/teacher.model";
import { StudentModel } from "../../school-admin/student/student.model";
import { sendEmail } from "../../../utils/email";
import { env } from "../../../config/env";
import { ApiError } from "../../../utils/apiError";
import { DeleteAccountRequest } from "./deleteAccount.model";

export type CreateDeleteAccountRequestInput = {
  fullName: string;
  ipAddress?: string;
  reason: string;
  registeredPhoneNumber: string;
  role: string;
  schoolName: string;
  source?: string;
  userAgent?: string;
};

type VerifiedAccountContext = {
  accountLabel: string;
  schoolId: string;
  schoolName: string;
  matchedName: string;
};

const normalizePhone = (value: string) =>
  String(value || "").replace(/\D/g, "").slice(-10);

const normalizeText = (value: string) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const normalizeRole = (value: string) => normalizeText(value);

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const throwAccountError = (statusCode: number, message: string) => {
  throw new ApiError(statusCode, message);
};

const ensureNameMatches = (providedName: string, candidates: string[]) => {
  const normalizedProvidedName = normalizeText(providedName);
  const normalizedCandidates = candidates
    .filter(Boolean)
    .map((candidate) => normalizeText(candidate));

  if (!normalizedCandidates.length) {
    throwAccountError(
      409,
      "Full name does not match our records for this registered phone number",
    );
  }

  if (!normalizedCandidates.includes(normalizedProvidedName)) {
    throwAccountError(
      409,
      "Full name does not match our records for this registered phone number",
    );
  }
};

const ensureSchoolMatches = (providedSchoolId: string, schoolId?: string) => {
  if (!schoolId) {
    throwAccountError(404, "School name does not match our records");
  }

  if (String(schoolId) !== String(providedSchoolId)) {
    throwAccountError(409, "School name does not match our records");
  }
};

const loadSchoolByName = async (schoolName: string): Promise<any> => {
  const normalizedSchoolName = normalizeText(schoolName);

  const school = await School.findOne({
    schoolName: new RegExp(`^${escapeRegExp(normalizedSchoolName)}$`, "i"),
  }).select("_id schoolName");

  if (!school) {
    throwAccountError(404, "School name does not match our records");
  }

  return school;
};

const verifyParentAccount = async (
  phone: string,
  school: { _id: unknown; schoolName: string },
  fullName: string,
) => {
  const schoolId = String(school._id);

  const user: any = await User.findOne({
    phone,
    role: UserRole.PARENT,
    status: "active",
  }).select("_id name phone role schoolId status");

  const anyStudents: any[] = await StudentModel.find({
    parentPhone: phone,
    status: "active",
  }).select("_id fatherName firstName lastName parentPhone schoolId status");

  const students: any[] = await StudentModel.find({
    parentPhone: phone,
    schoolId,
    status: "active",
  }).select("_id fatherName firstName lastName parentPhone schoolId status");

  if (!user && !anyStudents.length) {
    throwAccountError(404, "No parent account found for this phone number");
  }

  if (!students.length && anyStudents.length) {
    throwAccountError(409, "School name does not match our records");
  }

  const linkedSchoolIds = [
    user?.schoolId ? String(user.schoolId) : "",
    ...students.map((student) => String(student.schoolId)),
  ].filter((value): value is string => Boolean(value));

  if (linkedSchoolIds.length && !linkedSchoolIds.includes(String(school._id))) {
    throwAccountError(409, "School name does not match our records");
  }

  const candidateNames = [
    user?.name,
    ...students.map((student) => student.fatherName),
  ].filter((value): value is string => Boolean(value));
  ensureNameMatches(fullName, candidateNames);

  return {
    accountLabel: "Parent",
    matchedName: user?.name || students[0]?.fatherName || fullName,
    schoolId: String(school._id),
    schoolName: school.schoolName,
  } satisfies VerifiedAccountContext;
};

const verifyTeacherAccount = async (
  phone: string,
  school: { _id: unknown; schoolName: string },
  fullName: string,
) => {
  const schoolId = String(school._id);

  const teacher: any = await TeacherModel.findOne({
    phone,
    schoolId,
    status: "active",
  }).select("_id firstName lastName phone schoolId status");

  if (!teacher) {
    const anyTeacher: any = await TeacherModel.findOne({
      phone,
      status: "active",
    }).select("_id schoolId");

    if (anyTeacher) {
      throwAccountError(409, "School name does not match our records");
    }

    throwAccountError(404, "No teacher account found for this phone number");
  }

  ensureNameMatches(fullName, [
    `${teacher.firstName} ${teacher.lastName}`,
    `${teacher.lastName} ${teacher.firstName}`,
  ]);

  return {
    accountLabel: "Teacher",
    matchedName: `${teacher.firstName} ${teacher.lastName}`.trim(),
    schoolId: String(teacher.schoolId),
    schoolName: school.schoolName,
  } satisfies VerifiedAccountContext;
};

const verifyStudentAccount = async (
  phone: string,
  school: { _id: unknown; schoolName: string },
  fullName: string,
) => {
  const schoolId = String(school._id);

  const user: any = await User.findOne({
    phone,
    role: UserRole.STUDENT,
    status: "active",
  }).select("_id name phone role schoolId status");

  if (!user) {
    throwAccountError(404, "No student account found for this phone number");
  }

  const student: any = await StudentModel.findOne({
    userId: user._id,
    schoolId,
    status: "active",
  }).select("_id firstName lastName schoolId userId status");

  if (!student) {
    const anyStudent: any = await StudentModel.findOne({
      userId: user._id,
      status: "active",
    }).select("_id schoolId");

    if (anyStudent) {
      throwAccountError(409, "School name does not match our records");
    }

    throwAccountError(404, "No student record found for this phone number");
  }

  ensureNameMatches(fullName, [
    user.name || "",
    `${student.firstName} ${student.lastName || ""}`.trim(),
  ]);

  return {
    accountLabel: "Student",
    matchedName: user.name || `${student.firstName} ${student.lastName || ""}`.trim(),
    schoolId: String(student.schoolId),
    schoolName: school.schoolName,
  } satisfies VerifiedAccountContext;
};

const verifyStaffAccount = async (
  phone: string,
  school: { _id: unknown; schoolName: string },
  fullName: string,
) => {
  const user: any = await User.findOne({
    phone,
    role: UserRole.SCHOOL_ADMIN,
    status: "active",
  }).select("_id name phone role schoolId status");

  if (!user) {
    throwAccountError(404, "No staff account found for this phone number");
  }

  ensureSchoolMatches(String(school._id), user.schoolId?.toString());
  ensureNameMatches(fullName, [user.name || ""]);

  return {
    accountLabel: "Staff",
    matchedName: user.name || fullName,
    schoolId: String(user.schoolId || school._id),
    schoolName: school.schoolName,
  } satisfies VerifiedAccountContext;
};

const verifyOtherAccount = async (
  phone: string,
  school: { _id: unknown; schoolName: string },
  fullName: string,
) => {
  const user: any = await User.findOne({
    phone,
    status: "active",
  }).select("_id name phone role schoolId status");

  if (!user) {
    throwAccountError(404, "No account found for this phone number");
  }

  if (user.schoolId) {
    ensureSchoolMatches(String(school._id), user.schoolId.toString());
  }

  ensureNameMatches(fullName, [user.name || ""]);

  return {
    accountLabel: String(user.role || "Other"),
    matchedName: user.name || fullName,
    schoolId: String(user.schoolId || school._id),
    schoolName: school.schoolName,
  } satisfies VerifiedAccountContext;
};

const verifyAccountForRequest = async (
  input: CreateDeleteAccountRequestInput,
): Promise<VerifiedAccountContext> => {
  const phone = normalizePhone(input.registeredPhoneNumber);
  const role = normalizeRole(input.role);
  const school: any = await loadSchoolByName(input.schoolName);

  if (!phone || phone.length !== 10) {
    throwAccountError(400, "Enter a valid registered phone number");
  }

  if (role === "parent") {
    return verifyParentAccount(phone, school, input.fullName);
  }

  if (role === "teacher") {
    return verifyTeacherAccount(phone, school, input.fullName);
  }

  if (role === "student") {
    return verifyStudentAccount(phone, school, input.fullName);
  }

  if (role === "staff") {
    return verifyStaffAccount(phone, school, input.fullName);
  }

  return verifyOtherAccount(phone, school, input.fullName);
};

export const createDeleteAccountRequest = async (
  input: CreateDeleteAccountRequestInput,
) => {
  const verifiedContext = await verifyAccountForRequest(input);

  const payload = {
    fullName: input.fullName.trim(),
    ipAddress: input.ipAddress || "",
    reason: input.reason.trim(),
    registeredPhoneNumber: normalizePhone(input.registeredPhoneNumber),
    role: input.role.trim(),
    schoolName: input.schoolName.trim(),
    source: input.source || "web",
    userAgent: input.userAgent || "",
  };

  const supportEmail = env.DELETE_ACCOUNT_SUPPORT_EMAIL || env.EMAIL_USER;

  const emailHtml = `
    <h2>Delete account request</h2>
    <p><strong>Name:</strong> ${payload.fullName}</p>
    <p><strong>Phone:</strong> ${payload.registeredPhoneNumber}</p>
    <p><strong>School:</strong> ${payload.schoolName}</p>
    <p><strong>Role:</strong> ${payload.role}</p>
    <p><strong>Reason:</strong> ${payload.reason}</p>
    <p><strong>Matched Account:</strong> ${verifiedContext.accountLabel}</p>
    <p><strong>Matched Name:</strong> ${verifiedContext.matchedName}</p>
    <p><strong>Source:</strong> ${payload.source}</p>
    <p><strong>User Agent:</strong> ${payload.userAgent}</p>
    <p><strong>IP Address:</strong> ${payload.ipAddress}</p>
  `;

  const request = await DeleteAccountRequest.create(payload);

  if (supportEmail) {
    await sendEmail(
      supportEmail,
      `Delete account request: ${payload.fullName}`,
      emailHtml,
    ).catch((error) => {
      console.error("Delete account notification email failed", error);
    });
  }

  return {
    requestId: request._id.toString(),
    storage: "database" as const,
    verifiedContext,
  };
};
