import { NextFunction, Response } from "express";

import { successResponse } from "../../utils/apiResponse";
import { ApiError } from "../../utils/apiError";
import { StudentModel } from "../school-admin/student/student.model";
import {
  getDashboardData,
  getStudentExams,
  getStudentFeesService,
  getStudentSubjectMarks,
  getStudentTodayTimetable,
  getStudentWeeklyTimetable,
} from "./student.service";

/* ================= DASHBOARD ================= */

export const getStudentDashboard = async (
  req: any,
  res: Response,
  next: NextFunction,
) => {
  try {
    const studentId = req.query.studentId as string;

    if (!studentId) {
      throw new ApiError(400, "studentId is required");
    }

    const data = await getDashboardData(req.user, studentId);

    return successResponse(res, data, "Dashboard fetched");
  } catch (error) {
    return next(error);
  }
};

/* ================= TODAY TIMETABLE ================= */

export const getStudentToday = async (req: any, res: Response, next: NextFunction) => {
  try {
    const data = await getStudentTodayTimetable(req.user);

    return successResponse(res, data, "Today timetable fetched");
  } catch (error) {
    return next(error);
  }
};

/* ================= WEEKLY TIMETABLE ================= */

export const getStudentWeekly = async (
  req: any,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = await getStudentWeeklyTimetable(req.user);

    return successResponse(res, data, "Weekly timetable fetched");
  } catch (error) {
    return next(error);
  }
};

/* ================= EXAMS ================= */

export const getStudentExamList = async (
  req: any,
  res: Response,
  next: NextFunction,
) => {
  try {
    const studentId = req.query.studentId as string;

    if (!studentId) {
      throw new ApiError(400, "studentId is required");
    }

    const data = await getStudentExams(req.user, studentId);

    return successResponse(res, data, "Exams fetched");
  } catch (error) {
    return next(error);
  }
};

/* ================= MARKS ================= */

export const getMyMarks = async (
  req: any,
  res: Response,
  next: NextFunction,
) => {
  try {
    const studentId = req.query.studentId as string;

    if (!studentId) {
      throw new ApiError(400, "studentId is required");
    }

    const data = await getStudentSubjectMarks(req.user.schoolId, studentId);

    return successResponse(res, data, "Marks fetched");
  } catch (error) {
    return next(error);
  }
};

export const getFeesByStudent = async (
  req: any,
  res: Response,
  next: NextFunction,
) => {
  try {
    // WHY: Parents can have multiple student records over time, so we only
    // resolve the student that belongs to the authenticated school context.
    const student = await StudentModel.findOne({
      parentPhone: req.user.phone,
      schoolId: req.user.schoolId,
    }).select("_id");

    if (!student) {
      throw new ApiError(404, "Student not found");
    }

    const data = await getStudentFeesService(student._id.toString());

    return successResponse(res, data, "Fees fetched");
  } catch (error) {
    return next(error);
  }
};
