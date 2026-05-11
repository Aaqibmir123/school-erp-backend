import mongoose from "mongoose";

import { AttendanceModel } from "../attendance/attendance.model";
import Exam from "../exam/exam.model";
import { HomeworkModel } from "../homework/homework.model";
import { ResultModel } from "../result/result.model";
import FeeModel from "../school-admin/Fee/Fee.model";
import academicExamModel from "../school-admin/exams/academicExam.model";
import ScheduleModel from "../school-admin/schedule/schedule.model";
import { StudentModel } from "../school-admin/student/student.model";
import { School } from "../school/school.model";
import TimetableModel from "../school-admin/timetable/timetable.model";
import Mark from "../acdamicData/marks/marks.model";

/* ================= HELPERS ================= */

const toObjectId = (id: string) => new mongoose.Types.ObjectId(id);

const getStudentOrThrow = async (schoolId: string, studentId: string) => {
  if (!studentId) throw new Error("studentId required");

  const student: any = await StudentModel.findOne({
    _id: studentId,
    schoolId,
    status: "active",
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

const isParentLikeRole = (role?: string) => {
  const normalized = String(role || "").toUpperCase();
  return normalized === "PARENT" || normalized === "REVIEWER";
};

const isSameOrFuture = (value?: string | Date | null) => {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  return date.getTime() >= startOfToday.getTime();
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
      (async () => {
        const classExamQuery: Record<string, any> = {
          schoolId,
          classIds: student.classId?._id,
          date: { $gte: new Date() },
        };

        if (student.sectionId?._id) {
          classExamQuery.$or = [
            { sectionId: student.sectionId._id },
            { sectionId: null },
            { sectionId: { $exists: false } },
          ];
        } else {
          classExamQuery.sectionId = null;
        }

  const [schoolExamIds, classExamIds] = await Promise.all([
    (academicExamModel.distinct("_id", {
      schoolId,
      isPublished: true,
      endDate: { $gte: new Date() },
    }) as Promise<any[]>),
          (Exam.distinct("_id", classExamQuery) as Promise<any[]>),
      ]);

        const schoolExamCount = schoolExamIds.length
          ? await ScheduleModel.distinct(
              "examId",
              getSectionAwareQuery(
                schoolId,
                student.classId?._id,
                student.sectionId?._id,
                {
                  examId: { $in: schoolExamIds },
                },
              ),
            )
          : [];

        const classExamCount = classExamIds.filter(Boolean);

        return new Set([
          ...schoolExamCount.map(String),
          ...classExamCount.map(String),
        ]).size;
      })(),
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
    rollNumber: student.rollNumber ?? null,
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
  const today = new Date();

  const schoolExamIds: any[] = await academicExamModel.distinct("_id", {
    schoolId,
    isPublished: true,
    endDate: { $gte: today },
  });

  const classExamIds: any[] = await Exam.distinct("_id", {
    schoolId,
    classIds: student.classId?._id,
    date: { $gte: today },
    ...(student.sectionId?._id
      ? {
          $or: [
            { sectionId: student.sectionId._id },
            { sectionId: null },
            { sectionId: { $exists: false } },
          ],
        }
      : { sectionId: null }),
  });

  const scheduleQuery: Record<string, any> = {
    schoolId,
    classId: student.classId?._id,
  };

  if (student.sectionId?._id) {
    scheduleQuery.sectionId = student.sectionId._id;
  }

  const [schoolSchedules, classExams] = await Promise.all([
    schoolExamIds.length
      ? ScheduleModel.find({
          ...scheduleQuery,
          examId: { $in: schoolExamIds },
        })
          .populate("examId", "name examType isPublished totalMarks startDate endDate")
          .populate("subjectId", "name")
          .populate("sectionId", "name")
          .populate("classId", "name")
          .sort({ date: 1 })
          .lean()
      : Promise.resolve([] as any[]),
    classExamIds.length
      ? Exam.find({
          _id: { $in: classExamIds },
          schoolId,
          classIds: student.classId?._id,
          date: { $gte: today },
        })
          .populate("classIds", "name")
          .populate("sectionId", "name")
          .populate("subjectId", "name")
          .sort({ date: 1 })
          .lean()
      : Promise.resolve([] as any[]),
  ]);

  const schoolGrouped = new Map<string, any[]>();
  schoolSchedules
    .filter((schedule: any) => schedule.examId)
    .forEach((schedule: any) => {
      const examKey = `school-${String(schedule.examId?._id || schedule.examId)}`;
      const list = schoolGrouped.get(examKey) || [];
      list.push(schedule);
      schoolGrouped.set(examKey, list);
    });

  const schoolItems = Array.from(schoolGrouped.entries()).map(([, examSchedules]) => {
    const firstSchedule = examSchedules[0];
    const lastSchedule = examSchedules[examSchedules.length - 1];
    const scheduleDates = examSchedules
      .map((schedule: any) => new Date(schedule.date || 0).getTime())
      .filter((time: number) => Number.isFinite(time))
      .sort((a: number, b: number) => a - b);

    return {
      category: "school",
      className: firstSchedule.classId?.name || "N/A",
      date: firstSchedule.examId?.startDate || firstSchedule.date,
      endDate:
        firstSchedule.examId?.endDate ||
        (scheduleDates.length
          ? new Date(scheduleDates[scheduleDates.length - 1])
          : firstSchedule.date),
      endTime: lastSchedule?.endTime || firstSchedule.endTime,
      examType: firstSchedule.examId?.examType || "final",
      id: String(firstSchedule.examId?._id || firstSchedule.examId),
      section: firstSchedule.sectionId?.name || "All",
      sectionName: firstSchedule.sectionId?.name || "All",
      startDate:
        firstSchedule.examId?.startDate ||
        (scheduleDates.length ? new Date(scheduleDates[0]) : firstSchedule.date),
      startTime: firstSchedule.startTime,
      status: firstSchedule.examId?.isPublished ? "published" : "upcoming",
      title: firstSchedule.examId?.name || "Exam",
      totalMarks: firstSchedule.examId?.totalMarks || 0,
    };
  });

  const classItems = classExams.map((exam: any) => ({
    category: "class",
    className: exam.classIds?.[0]?.name || student.classId?.name || "N/A",
    date: exam.date,
    endDate: exam.date,
    examType: exam.examType || "class_test",
    id: String(exam._id),
    section: exam.sectionId?.name || "All",
    sectionName: exam.sectionId?.name || "All",
    startDate: exam.date,
    status: "published",
    subject: exam.subjectId?.name || "N/A",
    title: exam.name || "Exam",
    totalMarks: exam.totalMarks || 0,
  }));

  return [...schoolItems, ...classItems].sort((a, b) => {
    const aTime = new Date(a.startDate || a.date || 0).getTime();
    const bTime = new Date(b.startDate || b.date || 0).getTime();
    return aTime - bTime;
  });
};

/* ================= TODAY TIMETABLE ================= */

export const getStudentTodayTimetable = async (user: any) => {
  const { schoolId, id, role, phone } = user;

  let student: any = null;

  if (role === "STUDENT") {
    student = await StudentModel.findOne({ userId: id, schoolId, status: "active" })
      .populate("classId", "name")
      .populate("sectionId", "name")
      .lean();
  }

  if (isParentLikeRole(role)) {
    student = await StudentModel.findOne({
      parentPhone: { $in: getPhoneVariants(phone) },
      schoolId,
      status: "active",
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
    student = await StudentModel.findOne({ userId: id, schoolId, status: "active" })
      .populate("classId", "name")
      .populate("sectionId", "name")
      .lean();
  }

  if (isParentLikeRole(role)) {
    student = await StudentModel.findOne({
      parentPhone: { $in: getPhoneVariants(phone) },
      schoolId,
      status: "active",
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

  const approvedExamIds: any[] = await academicExamModel.distinct("_id", {
    schoolId,
    marksCardStatus: "approved",
  });

  const approvedExamObjectIds = approvedExamIds.map((id: any) =>
    new mongoose.Types.ObjectId(String(id)),
  );

  if (!approvedExamObjectIds.length) return [];

  const [resultRecords, markRecords] = await Promise.all([
    ResultModel.find({
      schoolId,
      studentId: toObjectId(studentId),
      examId: { $in: approvedExamObjectIds },
    })
      .select("examId subjectId marksObtained totalMarks")
      .populate("subjectId", "name")
      .populate("examId", "name examType marksCardStatus")
      .sort({ createdAt: -1 })
      .lean(),
    Mark.find({
      schoolId,
      studentId: toObjectId(studentId),
      examId: { $in: approvedExamObjectIds },
    })
      .select("examId subjectId marks classId sectionId rollNumberSnapshot createdAt")
      .populate("subjectId", "name")
      .populate("examId", "name examType totalMarks marksCardStatus")
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  const results = [
    ...resultRecords.map((record: any) => ({
      examId: record.examId,
      subjectId: record.subjectId,
      marksObtained: record.marksObtained,
      totalMarks: Number(record.examId?.totalMarks || record.totalMarks || 100),
      exam: record.examId,
      createdAt: record.createdAt,
    })),
    ...markRecords.map((record: any) => ({
      examId: record.examId,
      subjectId: record.subjectId,
      marksObtained: record.marks,
      totalMarks: Number(record.examId?.totalMarks || 0),
      exam: record.examId,
      createdAt: record.createdAt,
    })),
  ];

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
      examName: result.exam?.name || result.examId?.name || "Exam",
      examType: result.exam?.examType || result.examId?.examType || "-",
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

export const getStudentClassTestRecords = async (
  schoolId: string,
  studentId: string,
) => {
  if (!studentId) throw new Error("StudentId required");

  const school = await School.findById(schoolId).select("schoolName").lean();

  const records = await Mark.find({
    schoolId,
    studentId: toObjectId(studentId),
  })
    .select("examId subjectId marks feedback teacherId teacherNameSnapshot updatedAt createdAt")
    .populate("subjectId", "name")
    .populate("teacherId", "firstName lastName")
    .populate("examId", "name examType totalMarks date")
    .sort({ updatedAt: -1, createdAt: -1 })
    .lean();

  const classRecords = records
    .filter((record: any) => {
      const examType = String(record.examId?.examType || "").toLowerCase();
      return examType === "class_test" || examType === "unit_test";
    })
      .map((record: any) => {
        const teacherName = record.teacherNameSnapshot?.trim()
          || (record.teacherId
            ? `${record.teacherId.firstName || ""} ${record.teacherId.lastName || ""}`.trim()
            : "")
          || "N/A";

        return {
          examName: record.examId?.name || "Class Test",
          examType: record.examId?.examType || "class_test",
          feedback: record.feedback || "",
          marks: Number(record.marks || 0),
          schoolName: school?.schoolName || "School",
          subject: record.subjectId?.name || "N/A",
          teacherName,
          totalMarks: Number(record.examId?.totalMarks || 0),
          createdAt: record.createdAt || null,
          updatedAt: record.updatedAt || record.createdAt || null,
        };
      });

  return classRecords;
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
