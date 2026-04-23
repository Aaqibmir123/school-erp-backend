import dayjs from "dayjs";
import mongoose from "mongoose";

import TeacherAssignment from "../school-admin/teacher/teacherAssignment.model";
import TimeTable from "../school-admin/timetable/timetable.model";
import { AttendanceModel } from "./attendance.model";

/* =========================
   🔥 COMMON OBJECTID HELPER
========================= */
const toObjectId = (id: string) => new mongoose.Types.ObjectId(id);

/* =========================
   🔥 MARK ATTENDANCE
========================= */
export const markAttendanceService = async (
  schoolId: string,
  user: any,
  data: any,
) => {
  const { classId, sectionId, subjectId, periodId, date, students, isManual } =
    data;

  /* ================= VALIDATION ================= */
  if (!classId || !subjectId || !periodId || !date || !students?.length) {
    throw new Error("Missing required fields ❌");
  }

  if (!user?.teacherId) {
    throw new Error("Invalid teacher ❌");
  }

  const teacherId = toObjectId(user.teacherId);

  /* ================= ASSIGNMENT CHECK ================= */
  const assignment = await TeacherAssignment.findOne({
    schoolId,
    teacherId,
    classId,
    subjectId,
  });

  if (!assignment) {
    throw new Error("Not assigned to this class/subject ❌");
  }

  /* ================= DATE VALIDATION ================= */
  const today = dayjs().startOf("day");
  const selectedDate = dayjs(date).startOf("day");

  if (!selectedDate.isValid()) {
    throw new Error("Invalid date ❌");
  }

  if (selectedDate.isAfter(today)) {
    throw new Error("Future attendance not allowed ❌");
  }

  const diffDays = today.diff(selectedDate, "day");

  if (diffDays > 7) {
    throw new Error("Attendance too old ❌");
  }

  let mode: "AUTO" | "MANUAL" = "AUTO";

  /* ================= TIMETABLE CHECK ================= */
  if (diffDays === 0 && !isManual) {
    const now = dayjs();
    const todayDay = now.format("dddd");

    const todayClass = await TimeTable.findOne({
      schoolId,
      teacherId,
      classId,
      subjectId,
      day: todayDay,
    }).sort({ startMinutes: 1 });

    if (!todayClass) {
      throw new Error("No class assigned today ❌");
    }

    const currentMinutes = now.hour() * 60 + now.minute();

    if (currentMinutes < todayClass.startMinutes) {
      throw new Error("Class not started yet ❌");
    }

    if (currentMinutes > todayClass.endMinutes) {
      mode = "MANUAL";
    }
  }

  /* ================= PAST DATE ================= */
  if (diffDays > 0) {
    if (!isManual) {
      throw new Error("Enable manual for past attendance ⚠️");
    }
    mode = "MANUAL";
  }

  /* ================= SECTION ================= */
  if (!sectionId) {
    throw new Error("Section is required ❌");
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
          isManual: !!isManual,
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
        ? "Attendance marked successfully ✅"
        : "Attendance marked (Manual) ⚠️",
  };
};

/* =========================
   🔥 CLASS ATTENDANCE
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

/* =========================
   🔥 STUDENT TODAY
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
   🔥 STUDENT HISTORY
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
   🔥 STUDENT SUMMARY
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
