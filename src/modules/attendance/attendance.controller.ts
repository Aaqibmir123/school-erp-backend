import { Response } from "express";
import {
  getClassAttendanceService,
  getAttendanceHistoryService,
  getStudentAttendanceService,
  getStudentSummaryService,
  getStudentTodayAttendanceService,
  markAttendanceService,
} from "./attendance.service";

/* =========================
   🔥 TEACHER: MARK ATTENDANCE
========================= */
export const markAttendance = async (req: any, res: any) => {
  try {
    const schoolId = req.user.schoolId;
    const user = req.user;

    const result = await markAttendanceService(schoolId, user, req.body);

    return res.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

/* =========================
   🔥 TEACHER: CLASS ATTENDANCE
========================= */
export const getClassAttendance = async (req: any, res: Response) => {
  try {
    const schoolId = req.user.schoolId;

    const { classId, sectionId, periodId, subjectId, date } = req.query;

    if (!classId || !periodId || !subjectId || !date) {
      return res.status(400).json({
        message: "Missing required query params",
      });
    }

    const data = await getClassAttendanceService(
      schoolId,
      classId,
      sectionId,
      periodId,
      subjectId,
      date,
    );

    return res.json({
      success: true,
      data,
    });
  } catch (err: any) {
    return res.status(500).json({
      message: err.message,
    });
  }
};

/* =========================
   TEACHER: ATTENDANCE HISTORY
========================= */
export const getAttendanceHistory = async (req: any, res: Response) => {
  try {
    const schoolId = req.user.schoolId;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const result = await getAttendanceHistoryService({
      schoolId,
      classId: req.query.classId as string | undefined,
      sectionId: req.query.sectionId as string | undefined,
      subjectId: req.query.subjectId as string | undefined,
      studentId: req.query.studentId as string | undefined,
      mode: req.query.mode as string | undefined,
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
      search: req.query.search as string | undefined,
      page,
      limit,
    });

    return res.json({
      success: true,
      data: result.data,
      meta: result.meta,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* =========================
   🔥 COMMON STUDENT ID RESOLVER
========================= */
const getStudentId = (req: any) => {
  return req.query.studentId || req.user.studentId;
};

/* =========================
   🔥 STUDENT: TODAY ATTENDANCE
========================= */
export const getStudentTodayAttendance = async (req: any, res: Response) => {
  try {
    const schoolId = req.user.schoolId;
    const studentId = getStudentId(req);

    if (!studentId) {
      return res.status(400).json({
        message: "StudentId required",
      });
    }

    const today = new Date().toISOString().split("T")[0];

    const data = await getStudentTodayAttendanceService(
      schoolId,
      studentId,
      today,
    );

    return res.json({
      success: true,
      data,
    });
  } catch (err: any) {
    return res.status(500).json({
      message: err.message,
    });
  }
};

/* =========================
   🔥 STUDENT: HISTORY
========================= */
export const getStudentAttendance = async (req: any, res: Response) => {
  try {
    const schoolId = req.user.schoolId;
    const studentId = getStudentId(req);

    if (!studentId) {
      return res.status(400).json({
        message: "StudentId required",
      });
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const result = await getStudentAttendanceService(
      schoolId,
      studentId,
      page,
      limit,
    );

    return res.json({
      success: true,
      data: result.data,
      meta: result.meta,
    });
  } catch (err: any) {
    return res.status(500).json({
      message: err.message,
    });
  }
};

/* =========================
   🔥 STUDENT: SUMMARY
========================= */
export const getStudentSummary = async (req: any, res: Response) => {
  try {
    const schoolId = req.user.schoolId;
    const studentId = getStudentId(req);

    if (!studentId) {
      return res.status(400).json({
        message: "StudentId required",
      });
    }

    const summary = await getStudentSummaryService(schoolId, studentId);

    return res.json({
      success: true,
      data: summary,
    });
  } catch (err: any) {
    return res.status(500).json({
      message: err.message,
    });
  }
};
