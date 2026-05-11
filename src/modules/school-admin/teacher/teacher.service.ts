import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { CreateTeacherDTO } from "../../../../shared-types/teacher.types";
import { getDayFromDate, isSameDate } from "../../../utils/time.utils";
import { ApiError } from "../../../utils/apiError";
import { User, UserRole } from "../../user/user.model";
import { StudentModel } from "../student/student.model";
import TimetableModel from "../timetable/timetable.model";
import { TeacherModel } from "./teacher.model";
import teacherAssignmentModel from "./teacherAssignment.model";
/* =========================
   GET TODAY
========================= */

const DAY_VARIANTS: Record<string, string[]> = {
  Sunday: ["Sun"],
  Monday: ["Mon"],
  Tuesday: ["Tue"],
  Wednesday: ["Wed"],
  Thursday: ["Thu"],
  Friday: ["Fri"],
  Saturday: ["Sat"],
};

const getDayVariants = (day: string) => {
  const shortDay = Object.entries(DAY_VARIANTS).find(([longName]) =>
    [longName, ...(DAY_VARIANTS[longName] || [])].includes(day),
  )?.[0];

  if (!shortDay) return [day];

  return [shortDay, ...(DAY_VARIANTS[shortDay] || [])];
};

/* =========================
   FORMAT CLASS
========================= */
const formatClass = (item: any) => {
  const sectionRef = item.sectionId;

  return {
    classId: item.classId?._id,
    sectionId: sectionRef?._id || sectionRef || null,
    subjectId: item.subjectId?._id,
    periodId: item.periodId?._id,

    className: item.classId?.name,
    sectionName: sectionRef?.name || "General",
    subjectName: item.subjectId?.name,

    startTime: item.periodId?.startTime,
    endTime: item.periodId?.endTime,
  };
};

const sanitizeProfileUpdate = (data: Record<string, any>) => {
  // WHY: Teacher profile updates often come from partially filled forms.
  // We keep existing DB values when a field is left blank so profile edits
  // and image uploads do not fail on required schema fields like email.
  const allowedFields = [
    "firstName",
    "lastName",
    "email",
    "phone",
    "gender",
    "qualification",
    "address",
    "profileImage",
  ];

  return allowedFields.reduce((acc: Record<string, any>, field) => {
    const value = data[field];

    if (value === undefined || value === null) {
      return acc;
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed && field !== "profileImage") {
        return acc;
      }
      acc[field] = trimmed;
      return acc;
    }

    acc[field] = value;
    return acc;
  }, {});
};

const normalizeTeacherPhone = (phone?: string) => {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits.slice(-10);
};

const normalizeTeacherEmail = (email?: string) =>
  String(email || "").trim().toLowerCase();

const normalizeTeacherEmployeeId = (employeeId?: string) =>
  String(employeeId || "").trim();

const ensureTeacherIdentityIsUnique = async (
  schoolId: string,
  data: Partial<CreateTeacherDTO>,
  currentTeacherId?: string,
  currentUserId?: string,
) => {
  const phone = normalizeTeacherPhone(data.phone);
  const email = normalizeTeacherEmail(data.email);
  const employeeId = normalizeTeacherEmployeeId(data.employeeId);

  const teacherFilter: Record<string, any> = {
    schoolId,
  };

  if (currentTeacherId) {
    teacherFilter._id = { $ne: currentTeacherId };
  }

  const userFilter: Record<string, any> = {};

  if (currentUserId) {
    userFilter._id = { $ne: currentUserId };
  }

  if (phone) {
    const userPhoneExists = await User.findOne({
      ...userFilter,
      phone,
    }).select("_id role");

    if (userPhoneExists) {
      throw new ApiError(409, "Phone number already exists");
    }

    const teacherPhoneExists = await TeacherModel.findOne({
      ...teacherFilter,
      phone,
    }).select("_id");

    if (teacherPhoneExists) {
      throw new ApiError(409, "Phone number already exists");
    }
  }

  if (email) {
    const userEmailExists = await User.findOne({
      ...userFilter,
      email,
    }).select("_id role");

    if (userEmailExists) {
      throw new ApiError(409, "Email already exists");
    }

    const teacherEmailExists = await TeacherModel.findOne({
      ...teacherFilter,
      email,
    }).select("_id");

    if (teacherEmailExists) {
      throw new ApiError(409, "Email already exists");
    }
  }

  if (employeeId) {
    const teacherIdExists = await TeacherModel.findOne({
      ...teacherFilter,
      employeeId,
    }).select("_id");

    if (teacherIdExists) {
      throw new ApiError(409, "Teacher ID already exists");
    }
  }
};

/* =========================
   CURRENT CLASS (OPTIMIZED + CACHE)
========================= */

export const getCurrentClassService = async (teacherId: string) => {
  /* ================= TIME (IST) ================= */
  const now = new Date();

  const istTime = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
  );

  const currentMinutes = istTime.getHours() * 60 + istTime.getMinutes();

  const today = istTime.toLocaleString("en-US", {
    weekday: "long",
  });
  const todayVariants = getDayVariants(today);

  const teacherObjectId = new mongoose.Types.ObjectId(teacherId);

  /* ================= GET TODAY CLASSES ================= */
  const todayClasses = await TimetableModel.find({
    teacherId: teacherObjectId,
    day: { $in: todayVariants },
  })
    .populate("classId", "name")
    .populate("sectionId", "name")
    .populate("subjectId", "name")
    .populate("periodId", "startTime endTime")
    .sort({ startMinutes: 1 })
    .lean();

  let currentClassIndex = -1;
  let nextClassIndex = -1;

  for (let index = 0; index < todayClasses.length; index += 1) {
    const cls = todayClasses[index];

    if (
      nextClassIndex === -1 &&
      cls.startMinutes > currentMinutes &&
      cls.startMinutes - currentMinutes <= 10
    ) {
      nextClassIndex = index;
    }

    if (
      cls.startMinutes <= currentMinutes &&
      cls.endMinutes >= currentMinutes
    ) {
      currentClassIndex = index;
      break;
    }
  }

  /* ================= STUDENTS ================= */
  let students: any[] = [];

  const currentClassDoc =
    currentClassIndex >= 0 ? todayClasses[currentClassIndex] : null;

  if (currentClassDoc) {
    const classId = currentClassDoc.classId?._id;
    const subjectId = currentClassDoc.subjectId?._id;

    const assignment = await teacherAssignmentModel
      .findOne({
        teacherId: teacherObjectId,
        classId,
        subjectId,
      })
      .lean();

    /* 🔥 FIX: fallback if assignment not found */
    let query: any = {
      classId,
    };

    if (assignment) {
      query = {
        schoolId: assignment.schoolId,
        classId: assignment.classId,
      };

      if (assignment.sectionId) {
        query.sectionId = assignment.sectionId;
      }
    }

    students = await StudentModel.find(query)
      .select("_id firstName lastName rollNumber")
      .sort({ rollNumber: 1 })
      .lean();
  }

  const currentClass = currentClassDoc ? formatClass(currentClassDoc) : null;
  const recentClasses = todayClasses
    .slice(0, currentClassIndex > 0 ? currentClassIndex : 0)
    .reverse()
    .slice(0, 3)
    .map(formatClass);

  const upcomingClasses =
    nextClassIndex >= 0
      ? [todayClasses[nextClassIndex], ...todayClasses.slice(nextClassIndex + 1)]
          .filter((item: any) => item.startMinutes - currentMinutes <= 10)
          .map(formatClass)
          .slice(0, 4)
      : [];

  /* ================= FINAL ================= */
  return {
    currentClass,
    students,
    recentClasses,
    upcomingClasses,
  };
};

/* =========================
   TIMETABLE BY DATE (OPTIMIZED)
========================= */
export const getTeacherTimetableByDate = async (
  teacherId: string,
  date: string,
) => {
  const day = getDayFromDate(date);
  const dayVariants = getDayVariants(day);
  const timetable = await TimetableModel.find({
    teacherId,
    day: { $in: dayVariants },
  })
    .sort({ startMinutes: 1 })
    .populate("periodId")
    .populate("classId", "name")
    .populate("subjectId", "name")
    .populate("sectionId", "name")
    .populate("sectionId", "name")
    .lean();

  if (!timetable.length) return [];

  const now = new Date();
  const isToday = isSameDate(now, new Date(date));

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return timetable.map((item: any) => {
    let status: "done" | "current" | "upcoming" = "upcoming";

    if (isToday) {
      if (currentMinutes > item.endMinutes) status = "done";
      else if (
        currentMinutes >= item.startMinutes &&
        currentMinutes < item.endMinutes
      )
        status = "current";
    }

    return {
      ...formatClass(item),
      status,
    };
  });
};

/* =========================
   SET PASSWORD
========================= */
export const setTeachersPassword = async (
  schoolId: string,
  password: string,
) => {
  const hashedPassword = await bcrypt.hash(password, 10);

  return User.updateMany(
    {
      schoolId,
      role: UserRole.TEACHER,
    },
    {
      password: hashedPassword,
    },
  );
};

/* =========================
   CREATE TEACHER
========================= */
export const createTeacher = async (
  schoolId: string,
  data: CreateTeacherDTO & { profileImage?: string },
) => {
  await ensureTeacherIdentityIsUnique(schoolId, data);

  const user = await User.create({
    name: `${data.firstName} ${data.lastName}`,
    email: data.email,
    phone: data.phone,
    role: UserRole.TEACHER,
    schoolId,
    status: "active",
  });

  const teacher = await TeacherModel.create({
    ...data,
    schoolId,
    userId: user._id,
  });

  return {
    userId: user._id,
    teacherId: teacher._id,
  };
};

/* =========================
   CRUD
========================= */
export const getTeachers = async (
  schoolId: string,
  status?: string,
) => {
  const filter: any = { schoolId };

  if (status && status !== "all") {
    filter.status = status;
  } else {
    filter.status = { $ne: "inactive" };
  }

  return TeacherModel.find(filter).sort({ createdAt: -1 }).lean();
};

export const getTeacherById = async (id: string) => {
  return TeacherModel.findById(id).lean();
};

export const getTeacherByUserId = async (userId: string) => {
  if (!userId) return null;

  return TeacherModel.findOne({ userId }).lean();
};

export const getTeacherProfileByTeacherId = async (teacherId: string) => {
  const teacher = await TeacherModel.findById(teacherId)
    .select(
      "firstName lastName email phone gender dateOfBirth employeeId qualification experience joiningDate address profileImage schoolId userId status",
    )
    .lean();

  if (!teacher) {
    throw new ApiError(404, "Teacher not found");
  }

  return teacher;
};

export const updateTeacher = async (
  id: string,
  data: Partial<CreateTeacherDTO>,
) => {
  const teacher = await TeacherModel.findById(id).select("schoolId userId");

  if (!teacher) {
    throw new ApiError(404, "Teacher not found");
  }

  await ensureTeacherIdentityIsUnique(
    teacher.schoolId.toString(),
    data,
    teacher._id.toString(),
    teacher.userId?.toString?.(),
  );

  return TeacherModel.findByIdAndUpdate(id, data, {
    new: true,
  }).lean();
};

export const deleteTeacher = async (id: string) => {
  return TeacherModel.findByIdAndDelete(id);
};

export const getTeachersByClassService = async (
  schoolId: string,
  classId: string,
) => {
  if (!classId) {
    throw new Error("classId is required");
  }

  /* 🔥 STEP 1: ASSIGNMENTS */
  const assignments = await teacherAssignmentModel
    .find({
      classId,
      schoolId,
    })
    .lean();

  if (!assignments.length) {
    return [];
  }

  const teacherIds = [
    ...new Set(assignments.map((a: any) => a.teacherId.toString())),
  ];

  const teachers = await TeacherModel.find({
    _id: { $in: teacherIds },
    status: "active",
  })
    .select("firstName lastName")
    .lean();

  const result = teachers.map((t: any) => {
    const teacherAssignments = assignments.filter(
      (a: any) => a.teacherId.toString() === t._id.toString(),
    );

    return {
      _id: t._id,
      name: `${t.firstName} ${t.lastName}`,
      subjects: teacherAssignments.map((a: any) => a.subjectId),
    };
  });

  return result;
};

/* =========================
   UPDATE TEACHER (SYNC USER)
========================= */
export const updateTeacherService = async (
  schoolId: string,
  teacherId: string,
  data: any,
) => {
  const teacher = await TeacherModel.findOne({
    _id: teacherId,
    schoolId,
  });

  if (!teacher) {
    const err = new ApiError(404, "Teacher not found");
    throw err;
  }

  await ensureTeacherIdentityIsUnique(
    schoolId,
    data,
    teacher._id.toString(),
    teacher.userId?.toString?.(),
  );

  Object.assign(teacher, data);
  await teacher.save();

  if (teacher.userId) {
    await User.findByIdAndUpdate(teacher.userId, {
      name: `${teacher.firstName} ${teacher.lastName}`,
      email: teacher.email,
      phone: teacher.phone,
      ...(teacher.status === "disabled"
        ? { status: "disabled" }
        : teacher.status === "active"
          ? { status: "active" }
          : {}),
    });
  }

  return teacher;
};

export const updateTeacherProfileService = async (
  teacherId: string,
  data: any,
) => {
  const teacher = await TeacherModel.findById(teacherId);

  if (!teacher) {
    throw new ApiError(404, "Teacher not found");
  }

  const updateData = sanitizeProfileUpdate(data);

  await ensureTeacherIdentityIsUnique(
    String(teacher.schoolId || ""),
    updateData,
    teacher._id.toString(),
    teacher.userId?.toString?.(),
  );

  // WHY: Some existing teacher records were created before profile fields were
  // fully populated. Using a partial atomic update avoids save-time validation
  // failures on unchanged required fields while still updating only what the
  // teacher explicitly edited.
  const updatedTeacher = await TeacherModel.findByIdAndUpdate(
    teacherId,
    { $set: updateData },
    { new: true, runValidators: false },
  ).lean();

  if (teacher.userId) {
    const userUpdate: Record<string, any> = {
      name: `${
        updatedTeacher?.firstName || teacher.firstName || ""
      } ${updatedTeacher?.lastName || teacher.lastName || ""}`.trim(),
    };

    const updatedEmail = updatedTeacher?.email || teacher.email;
    const updatedPhone = updatedTeacher?.phone || teacher.phone;

    if (updatedEmail) userUpdate.email = updatedEmail;
    if (updatedPhone) userUpdate.phone = updatedPhone;

    await User.findByIdAndUpdate(teacher.userId, userUpdate);
  }

  return updatedTeacher || teacher.toObject();
};

/* =========================
   DELETE TEACHER (SAFE DELETE)
========================= */
export const deleteTeacherService = async (
  schoolId: string,
  teacherId: string,
) => {
  const teacher = await TeacherModel.findOne({
    _id: teacherId,
    schoolId,
  });

  if (!teacher) {
    const err: any = new Error("Teacher not found");
    err.statusCode = 404;
    throw err;
  }

  teacher.status = "inactive";
  await teacher.save();

  if (teacher.userId) {
    await User.findByIdAndUpdate(teacher.userId, {
      status: "disabled",
    });
  }

  return true;
};

export const updateTeacherAccountStatusService = async (
  schoolId: string,
  teacherId: string,
  status: "active" | "disabled",
) => {
  const teacher = await TeacherModel.findOne({
    _id: teacherId,
    schoolId,
  });

  if (!teacher) {
    const err: any = new Error("Teacher not found");
    err.statusCode = 404;
    throw err;
  }

  teacher.status = status;
  await teacher.save();

  if (teacher.userId) {
    await User.findByIdAndUpdate(teacher.userId, { status });
  }

  return teacher;
};
