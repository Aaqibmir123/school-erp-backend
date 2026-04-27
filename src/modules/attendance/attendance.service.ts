import dayjs from "dayjs";
import mongoose from "mongoose";

import TeacherAssignment from "../school-admin/teacher/teacherAssignment.model";
import TimeTable from "../school-admin/timetable/timetable.model";
import { StudentModel } from "../school-admin/student/student.model";
import { AttendanceModel } from "./attendance.model";

/* =========================
   COMMON OBJECTID HELPER
========================= */
const toObjectId = (id: string) => new mongoose.Types.ObjectId(id);

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
   MARK ATTENDANCE
========================= */
export const markAttendanceService = async (
  schoolId: string,
  user: any,
  data: any,
) => {
  const {
    classId,
    sectionId,
    subjectId,
    periodId,
    date,
    students,
    isManual,
    attendanceMode,
    reason,
  } = data;

  /* ================= VALIDATION ================= */
  if (!classId || !subjectId || !periodId || !date || !students?.length) {
    throw new Error("Missing required fields");
  }

  if (!user?.teacherId) {
    throw new Error("Invalid teacher");
  }

  const teacherId = toObjectId(user.teacherId);
  const isManualMode =
    String(attendanceMode || (isManual ? "MANUAL" : "AUTO")).toUpperCase() ===
    "MANUAL";
  const manualReason = String(reason || "").trim();

  /* ================= ASSIGNMENT CHECK ================= */
  const assignment = await TeacherAssignment.findOne({
    schoolId,
    teacherId,
    classId,
    subjectId,
  });

  if (!assignment) {
    throw new Error("Not assigned to this class/subject");
  }

  if (isManualMode && !manualReason) {
    throw new Error("Manual reason is required");
  }

  /* ================= DATE VALIDATION ================= */
  const today = dayjs().startOf("day");
  const selectedDate = dayjs(date).startOf("day");

  if (!selectedDate.isValid()) {
    throw new Error("Invalid date");
  }

  if (selectedDate.isAfter(today)) {
    throw new Error("Future attendance not allowed");
  }

  const diffDays = today.diff(selectedDate, "day");

  if (diffDays > 7) {
    throw new Error("Attendance too old");
  }

  let mode: "AUTO" | "MANUAL" = isManualMode ? "MANUAL" : "AUTO";

  /* ================= TIMETABLE CHECK ================= */
  if (diffDays === 0 && !isManualMode) {
    const now = dayjs();
    const todayDay = now.format("dddd");
    const todayVariants = getDayVariants(todayDay);

    const todayClass = await TimeTable.findOne({
      schoolId,
      teacherId,
      classId,
      subjectId,
      day: { $in: todayVariants },
    }).sort({ startMinutes: 1 });

    if (!todayClass) {
      throw new Error("No class assigned today");
    }

    const currentMinutes = now.hour() * 60 + now.minute();

    if (currentMinutes < todayClass.startMinutes) {
      throw new Error("Class not started yet. Use manual mode if needed");
    }

    if (currentMinutes > todayClass.endMinutes) {
      throw new Error("Class already ended. Use manual mode");
    }
  }

  /* ================= PAST DATE ================= */
  if (diffDays > 0) {
    if (!isManualMode) {
      throw new Error("Enable manual mode for past attendance");
    }
    mode = "MANUAL";
  }

  /* ================= SECTION ================= */
  if (!sectionId) {
    throw new Error("Section is required");
  }

  const finalSectionId = toObjectId(sectionId);

  /* ================= BULK WRITE ================= */
  const bulkOps = students.map((s: any) => ({
    updateOne: {
      filter: {
        schoolId,
        studentId: toObjectId(s.studentId),
        subjectId: toObjectId(subjectId),
        periodId: toObjectId(periodId),
        sectionId: finalSectionId,
        date,
      },
      update: {
        $set: {
          classId: toObjectId(classId),
          sectionId: finalSectionId,
          subjectId: toObjectId(subjectId),
          studentId: toObjectId(s.studentId),
          periodId: toObjectId(periodId),
          status: s.status,
          schoolId,
          date,
          markedBy: teacherId,
          mode,
          reason: manualReason,
        },
      },
      upsert: true,
    },
  }));

  await AttendanceModel.bulkWrite(bulkOps, { ordered: false });

  return {
    mode,
    message:
      mode === "AUTO"
        ? "Attendance marked successfully"
        : "Attendance marked (Manual)",
  };
};

/* =========================
   CLASS ATTENDANCE
========================= */
export const getClassAttendanceService = async (
  schoolId: string,
  classId: string,
  sectionId: string,
  periodId: string,
  subjectId: string,
  date: string,
) => {
  return AttendanceModel.find({
    schoolId,
    classId,
    sectionId,
    periodId,
    subjectId,
    date,
  })
    .populate("studentId", "firstName lastName rollNumber")
    .lean();
};

export const getAttendanceHistoryService = async ({
  schoolId,
  classId,
  sectionId,
  subjectId,
  studentId,
  mode,
  from,
  to,
  page = 1,
  limit = 20,
  search,
}: {
  schoolId: string;
  classId?: string;
  sectionId?: string;
  subjectId?: string;
  studentId?: string;
  mode?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  search?: string;
}) => {
  const query: any = {
    schoolId: new mongoose.Types.ObjectId(schoolId),
  };

  if (classId) query.classId = new mongoose.Types.ObjectId(classId);
  if (sectionId) query.sectionId = new mongoose.Types.ObjectId(sectionId);
  if (subjectId) query.subjectId = new mongoose.Types.ObjectId(subjectId);
  if (studentId) query.studentId = new mongoose.Types.ObjectId(studentId);
  if (mode) query.mode = mode.toUpperCase();

  if (from || to) {
    query.date = {};
    if (from) query.date.$gte = from;
    if (to) query.date.$lte = to;
  }

  if (search) {
    const studentMatches = await StudentModel.find({
      schoolId,
      $or: [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { rollNumber: Number(search) || -1 },
      ],
    })
      .select("_id")
      .lean();

    const ids = studentMatches.map((item: any) => item._id);

    if (!ids.length) {
      return {
        data: [],
        meta: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      };
    }

    query.studentId = { $in: ids };
  }

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    AttendanceModel.find(query)
      .populate("studentId", "firstName lastName rollNumber classId sectionId")
      .populate("subjectId", "name")
      .populate("periodId", "startTime endTime")
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AttendanceModel.countDocuments(query),
  ]);

  return {
    data: items,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/* =========================
   STUDENT TODAY
========================= */
export const getStudentTodayAttendanceService = async (
  schoolId: string,
  studentId: string,
  date: string,
) => {
  return AttendanceModel.find({
    schoolId,
    studentId: toObjectId(studentId),
    date,
  })
    .populate("subjectId", "name")
    .populate("periodId", "startTime endTime")
    .sort({ date: -1 })
    .lean();
};

/* =========================
   STUDENT HISTORY
========================= */
export const getStudentAttendanceService = async (
  schoolId: string,
  studentId: string,
  page = 1,
  limit = 10,
) => {
  const skip = (page - 1) * limit;

  const query = {
    schoolId,
    studentId: toObjectId(studentId),
  };

  const [data, total] = await Promise.all([
    AttendanceModel.find(query)
      .populate("subjectId", "name")
      .populate("periodId", "startTime endTime")
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    AttendanceModel.countDocuments(query),
  ]);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/* =========================
   STUDENT SUMMARY
========================= */
export const getStudentSummaryService = async (
  schoolId: string,
  studentId: string,
) => {
  const result = await AttendanceModel.aggregate([
    {
      $match: {
        schoolId,
        studentId: toObjectId(studentId),
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        present: {
          $sum: {
            $cond: [{ $eq: ["$status", "PRESENT"] }, 1, 0],
          },
        },
      },
    },
  ]);

  const data = result[0] || { total: 0, present: 0 };

  const percentage = data.total
    ? Math.round((data.present / data.total) * 100)
    : 0;

  return {
    total: data.total,
    present: data.present,
    absent: data.total - data.present,
    percentage,
  };
};
