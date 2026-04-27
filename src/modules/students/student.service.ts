import mongoose from "mongoose";

import { AttendanceModel } from "../attendance/attendance.model";
import ExamModel from "../exam/exam.model";
import { HomeworkModel } from "../homework/homework.model";
import { ResultModel } from "../result/result.model";
import FeeModel from "../school-admin/Fee/Fee.model";
import { StudentModel } from "../school-admin/student/student.model";
import { School } from "../school/school.model";
import TimetableModel from "../school-admin/timetable/timetable.model";

/* ================= HELPERS ================= */

const toObjectId = (id: string) => new mongoose.Types.ObjectId(id);

const getStudentOrThrow = async (schoolId: string, studentId: string) => {
  if (!studentId) throw new Error("studentId required");

  const student = await StudentModel.findOne({
    _id: studentId,
    schoolId,
  })
    .populate("classId", "name")
    .populate("sectionId", "name")
    .lean();

  if (!student) throw new Error("Student not found");

  return student;
};

const formatTime = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${m.toString().padStart(2, "0")}`;
};

const getSectionAwareQuery = (
  schoolId: string,
  classId: any,
  sectionId?: any,
  extraQuery: Record<string, unknown> = {},
) => ({
  schoolId,
  classId,
  ...extraQuery,
  ...(sectionId
    ? {
        $or: [{ sectionId }, { sectionId: null }, { sectionId: { $exists: false } }],
      }
    : { sectionId: null }),
});

const getCurrentDay = () =>
  new Date().toLocaleString("en-US", {
    weekday: "long",
  });

const getTodayDate = () => new Date().toISOString().split("T")[0];

const getPhoneVariants = (phone: string) => {
  const digits = phone.toString().replace(/\D/g, "");
  const normalized = digits.slice(-10);

  return Array.from(
    new Set([digits, normalized, `0${normalized}`].filter(Boolean)),
  );
};

/* ================= DASHBOARD ================= */

export const getDashboardData = async (user: any, studentId: string) => {
  const { schoolId } = user;

  const student = await getStudentOrThrow(schoolId, studentId);

  const attendanceRecords = await AttendanceModel.find({
    schoolId,
    studentId: student._id,
  })
    .select("status date")
    .lean();

  const total = attendanceRecords.length;
  const present = attendanceRecords.filter(
    (attendance) => attendance.status === "PRESENT",
  ).length;
  const percentage = total ? Math.round((present / total) * 100) : 0;

  const [todayAttendance, activeHomeworkCount, upcomingExamCount, pendingFeeCount, todayTimetable] =
    await Promise.all([
      AttendanceModel.findOne({
        date: getTodayDate(),
        schoolId,
        studentId: student._id,
      })
        .sort({ createdAt: -1 })
        .select("status")
        .lean(),
      HomeworkModel.countDocuments(
        getSectionAwareQuery(schoolId, student.classId?._id, student.sectionId?._id, {
          dueDate: { $gte: new Date() },
          status: "active",
        }),
      ),
      ExamModel.countDocuments(
        getSectionAwareQuery(schoolId, student.classId?._id, student.sectionId?._id, {
          date: { $gte: new Date() },
        }),
      ),
      FeeModel.countDocuments({
        remainingAmount: { $gt: 0 },
        schoolId,
        studentId: student._id,
      }),
      TimetableModel.find(
        getSectionAwareQuery(schoolId, student.classId?._id, student.sectionId?._id, {
          day: getCurrentDay(),
        }),
      )
        .populate("subjectId", "name")
        .populate("teacherId", "firstName lastName")
        .sort({ startMinutes: 1 })
        .lean(),
    ]);

  const currentMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const nextClass =
    todayTimetable.find((item: any) => item.endMinutes >= currentMinutes) ||
    null;
  const nextClassRecord = nextClass as any;

  return {
    attendance: {
      absent: total - present,
      percentage,
      present,
      todayStatus: todayAttendance?.status || "N/A",
    },
    className: student.classId?.name || "N/A",
    nextClass: nextClassRecord
      ? {
          endTime: formatTime(nextClassRecord.endMinutes),
          startTime: formatTime(nextClassRecord.startMinutes),
          subject: nextClassRecord.subjectId?.name || "N/A",
          teacher: nextClassRecord.teacherId
            ? `${nextClassRecord.teacherId.firstName} ${nextClassRecord.teacherId.lastName}`
            : "N/A",
        }
      : null,
    sectionName: student.sectionId?.name || "All",
    stats: {
      activeHomeworkCount,
      pendingFeeCount,
      upcomingExamCount,
    },
    studentId: student._id,
    studentName: `${student.firstName} ${student.lastName || ""}`.trim(),
  };
};

/* ================= EXAMS ================= */

export const getStudentExams = async (user: any, studentId: string) => {
  const { schoolId } = user;

  const student = await getStudentOrThrow(schoolId, studentId);

  const exams = await ExamModel.find({
    schoolId,
    classIds: { $in: [student.classId] },
    $or: [
      { sectionId: student.sectionId },
      { sectionId: null },
      { sectionId: { $exists: false } },
    ],
  })
    .populate("subjectId", "name")
    .populate("sectionId", "name")
    .populate("classIds", "name")
    .sort({ date: 1 })
    .lean();

  return exams.map((exam: any) => ({
    className: exam.classIds?.[0]?.name || "N/A",
    date: exam.date,
    examType: exam.examType,
    id: exam._id,
    sectionName: exam.sectionId?.name || "All",
    status: exam.status || "SCHEDULED",
    subject: exam.subjectId?.name || "N/A",
    title: exam.name,
    totalMarks: exam.totalMarks,
  }));
};

/* ================= TODAY TIMETABLE ================= */

export const getStudentTodayTimetable = async (user: any) => {
  const { schoolId, id, role, phone } = user;

  let student: any = null;

  if (role === "STUDENT") {
    student = await StudentModel.findOne({ userId: id, schoolId })
      .populate("classId", "name")
      .populate("sectionId", "name")
      .lean();
  }

  if (role === "PARENT") {
    student = await StudentModel.findOne({
      parentPhone: { $in: getPhoneVariants(phone) },
      schoolId,
    })
      .populate("classId", "name")
      .populate("sectionId", "name")
      .lean();
  }

  if (!student) throw new Error("Student not found");

  const today = getCurrentDay();
  const query = getSectionAwareQuery(schoolId, student.classId._id, student.sectionId?._id, {
    day: today,
  });

  const timetable = await TimetableModel.find(query)
    .populate("subjectId", "name")
    .populate("teacherId", "firstName lastName")
    .populate("classId", "name")
    .populate("sectionId", "name")
    .sort({ startMinutes: 1 })
    .lean();

  return timetable.map((rawItem: any) => {
    const item = rawItem as any;

    return {
      className: item.classId?.name || "N/A",
      endTime: formatTime(item.endMinutes),
      sectionName: item.sectionId?.name || "All",
      startTime: formatTime(item.startMinutes),
      subject: item.subjectId?.name || "-",
      teacher: item.teacherId
        ? `${item.teacherId.firstName} ${item.teacherId.lastName}`
        : "N/A",
    };
  });
};

/* ================= WEEKLY TIMETABLE ================= */

export const getStudentWeeklyTimetable = async (user: any) => {
  const { schoolId, id, role, phone } = user;

  let student: any = null;

  if (role === "STUDENT") {
    student = await StudentModel.findOne({ userId: id, schoolId })
      .populate("classId", "name")
      .populate("sectionId", "name")
      .lean();
  }

  if (role === "PARENT") {
    student = await StudentModel.findOne({
      parentPhone: { $in: getPhoneVariants(phone) },
      schoolId,
    })
      .populate("classId", "name")
      .populate("sectionId", "name")
      .lean();
  }

  if (!student) throw new Error("Student not found");

  const query = getSectionAwareQuery(schoolId, student.classId._id, student.sectionId?._id);

  const timetable = await TimetableModel.find(query)
    .populate("subjectId", "name")
    .populate("teacherId", "firstName lastName")
    .populate("classId", "name")
    .populate("sectionId", "name")
    .sort({ day: 1, startMinutes: 1 })
    .lean();

  const grouped: Record<string, any[]> = {};

  timetable.forEach((rawItem: any) => {
    const item = rawItem as any;

    if (!grouped[item.day]) grouped[item.day] = [];

    grouped[item.day].push({
      className: item.classId?.name || "N/A",
      endTime: formatTime(item.endMinutes),
      sectionName: item.sectionId?.name || "All",
      startTime: formatTime(item.startMinutes),
      subject: item.subjectId?.name || "-",
      teacher: item.teacherId
        ? `${item.teacherId.firstName} ${item.teacherId.lastName}`
        : "N/A",
    });
  });

  return grouped;
};

/* ================= MARKS ================= */

export const getStudentSubjectMarks = async (
  schoolId: string,
  studentId: string,
) => {
  if (!studentId) throw new Error("StudentId required");

  const school = await School.findById(schoolId).select("schoolName").lean();

  const results = await ResultModel.find({
    schoolId,
    studentId: toObjectId(studentId),
  })
    .populate("subjectId", "name")
    .populate("examId", "name examType")
    .sort({ createdAt: -1 })
    .lean();

  if (!results.length) return [];

  const subjectMap: Record<string, any> = {};

  for (const result of results) {
    const key = result.subjectId?._id?.toString() || "unknown";

    if (!subjectMap[key]) {
      subjectMap[key] = {
        exams: [],
        obtained: 0,
        subject: result.subjectId?.name || "N/A",
        total: 0,
      };
    }

    subjectMap[key].exams.push({
      examName: result.examId?.name || "Exam",
      examType: result.examId?.examType || "-",
      marks: result.marksObtained,
      totalMarks: result.totalMarks,
    });

    subjectMap[key].total += result.totalMarks || 0;
    subjectMap[key].obtained += result.marksObtained || 0;
  }

  return Object.values(subjectMap).map((subject: any) => ({
    exams: subject.exams,
    obtained: subject.obtained,
    percentage: subject.total
      ? Math.round((subject.obtained / subject.total) * 100)
      : 0,
    schoolName: school?.schoolName || "School",
    subject: subject.subject,
    total: subject.total,
  }));
};

export const getStudentFeesService = async (studentId: string) => {
  const fees = await FeeModel.find({ studentId })
    .select(
      `
      month 
      feeType 
      totalAmount 
      paidAmount 
      remainingAmount 
      status 
      dueDate 
      paidDate 
      receiptId
    `,
    )
    .sort({ createdAt: -1 })
    .lean();

  const receiptIds = fees
    .filter((fee: any) => fee.receiptId)
    .map((fee: any) => fee.receiptId);

  const receipts = await mongoose
    .model("Receipt")
    .find({
      _id: { $in: receiptIds },
    })
    .select("pdfUrl")
    .lean();

  const receiptMap: Record<string, any> = {};
  receipts.forEach((receipt: any) => {
    receiptMap[receipt._id.toString()] = receipt;
  });

  return fees.map((fee: any) => ({
    ...fee,
    pdfUrl: fee.receiptId
      ? receiptMap[fee.receiptId.toString()]?.pdfUrl || null
      : null,
  }));
};
