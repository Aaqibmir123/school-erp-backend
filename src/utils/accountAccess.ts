import { StudentModel } from "../modules/school-admin/student/student.model";
import { TeacherModel } from "../modules/school-admin/teacher/teacher.model";
import { UserRole } from "../modules/user/user.model";
import { ApiError } from "./apiError";
import {
  REVIEWER_ACCESS_MODULES,
  ensureReviewerAccessContext,
} from "./reviewerAccess";

const getPhoneVariants = (phone: string) => {
  const digits = String(phone || "").replace(/\D/g, "");
  const normalized = digits.slice(-10);

  return Array.from(
    new Set([digits, normalized, `0${normalized}`].filter(Boolean)),
  );
};

const withSchoolScope = (schoolId?: string) => (schoolId ? { schoolId } : {});

export const ensureTeacherAccountActive = async (user: {
  _id?: any;
  phone?: string;
  schoolId?: any;
}) => {
  const teacher = await TeacherModel.findOne({
    ...withSchoolScope(user.schoolId),
    status: "active",
    $or: [{ userId: user._id }, { phone: user.phone }],
  })
    .select("_id status schoolId userId")
    .lean();

  if (!teacher || teacher.status !== "active") {
    throw new ApiError(403, "Your account is disabled by school admin");
  }

  return teacher;
};

export const getActiveStudentsForParent = async (user: {
  _id?: any;
  phone?: string;
  schoolId?: any;
}) => {
  const phoneVariants = getPhoneVariants(user.phone || "");
  const queries: Record<string, unknown>[] = [];

  if (user._id) {
    queries.push({
      ...withSchoolScope(user.schoolId),
      parentUserId: user._id,
      status: "active",
    });
  }

  if (phoneVariants.length) {
    queries.push({
      ...withSchoolScope(user.schoolId),
      parentPhone: { $in: phoneVariants },
      status: "active",
    });
  }

  if (!queries.length) {
    return [];
  }

  return StudentModel.find({
    $or: queries,
  })
    .populate("classId", "name")
    .populate("sectionId", "name")
    .select("_id firstName lastName classId sectionId profileImage rollNumber")
    .lean();
};

export const ensureUserRoleAccess = async (user: {
  _id?: any;
  role?: string;
  phone?: string;
  schoolId?: any;
}) => {
  const role = String(user.role || "").toUpperCase();

  if (role === UserRole.REVIEWER) {
    const reviewer = await ensureReviewerAccessContext(user.phone);

    return {
      accessModules: [...REVIEWER_ACCESS_MODULES],
      students: reviewer.students,
      teacher: reviewer.teacher,
    };
  }

  if (role === UserRole.TEACHER) {
    const teacher = await ensureTeacherAccountActive(user);
    return { teacher };
  }

  if (role === UserRole.STUDENT) {
    const student = await StudentModel.findOne({
      ...withSchoolScope(user.schoolId),
      userId: user._id,
      status: "active",
    })
      .select("_id classId sectionId")
      .lean();

    if (!student) {
      throw new ApiError(403, "Your account is disabled by school admin");
    }

    return { student };
  }

  if (role === UserRole.PARENT) {
    const students = await getActiveStudentsForParent(user);
    console.log("Active students for parent:", students);

    return { students };
  }

  return {};
};
