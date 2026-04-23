import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { CreateTeacherDTO } from "../../../../../shared-types/teacher.types";
import { getDayFromDate, isSameDate } from "../../../utils/time.utils";
import { User, UserRole } from "../../user/user.model";
import { StudentModel } from "../student/student.model";
import TimetableModel from "../timetable/timetable.model";
import { TeacherModel } from "./teacher.model";
import teacherAssignmentModel from "./teacherAssignment.model";
/* =========================
   GET TODAY
========================= */

/* =========================
   FORMAT CLASS
========================= */
const formatClass = (item: any) => {
  return {
    classId: item.classId?._id,
    sectionId: item.sectionId,

    className: item.classId?.name,
    subjectName: item.subjectId?.name,

    startTime: item.periodId?.startTime,
    endTime: item.periodId?.endTime,
  };
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

  const teacherObjectId = new mongoose.Types.ObjectId(teacherId);

  /* ================= GET TODAY CLASSES ================= */
  const todayClasses = await TimetableModel.find({
    teacherId: teacherObjectId,
    day: today,
  })
    .populate("classId", "name")
    .populate("subjectId", "name")
    .populate("periodId", "startTime endTime")
    .sort({ startMinutes: 1 })
    .lean();

  let currentClassDoc: any = null;

  for (const cls of todayClasses) {
    if (
      cls.startMinutes <= currentMinutes &&
      cls.endMinutes >= currentMinutes
    ) {
      currentClassDoc = cls;
      break;
    }
  }

  /* ================= STUDENTS ================= */
  let students: any[] = [];

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

  /* ================= FORMAT ================= */
  const formatClass = (cls: any) => ({
    classId: cls.classId?._id,
    sectionId: cls.sectionId || null,
    periodId: cls.periodId?._id,
    subjectId: cls.subjectId?._id,
    className: cls.classId?.name,
    subjectName: cls.subjectId?.name,
    startTime: cls.periodId?.startTime,
    endTime: cls.periodId?.endTime,
  });

  /* ================= FINAL ================= */
  return {
    currentClass: currentClassDoc ? formatClass(currentClassDoc) : null,
    students,
    recentClasses: [],
    upcomingClasses: [],
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
  const timetable = await TimetableModel.find({
    teacherId,
    day,
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
  data: CreateTeacherDTO,
) => {
  const user = await User.create({
    name: `${data.firstName} ${data.lastName}`,
    email: data.email,
    phone: data.phone,
    role: UserRole.TEACHER,
    schoolId,
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
  includeInactive?: boolean,
) => {
  const filter: any = { schoolId };

  if (!includeInactive) {
    filter.status = "active";
  }

  return TeacherModel.find(filter).sort({ createdAt: -1 }).lean();
};

export const getTeacherById = async (id: string) => {
  return TeacherModel.findById(id).lean();
};

export const updateTeacher = async (
  id: string,
  data: Partial<CreateTeacherDTO>,
) => {
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
    throw new Error("Teacher not found");
  }

  Object.assign(teacher, data);
  await teacher.save();

  if (teacher.userId) {
    await User.findByIdAndUpdate(teacher.userId, {
      name: `${teacher.firstName} ${teacher.lastName}`,
      email: teacher.email,
      phone: teacher.phone,
    });
  }

  return teacher;
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

  return true;
};
