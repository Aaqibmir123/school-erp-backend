import { Request, Response } from "express";

import {
  getTeacherAttendanceHistoryService,
  markTeacherCheckInService,
  markTeacherCheckOutService,
  markTeacherLeaveService,
} from "./teacherAttendance.service";

export const markTeacherCheckIn = async (req: Request, res: Response) => {
  try {
    const data = await markTeacherCheckInService(
      req.user.schoolId,
      req.user,
      req.body,
    );

    return res.json({
      success: true,
      data,
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

export const markTeacherCheckOut = async (req: Request, res: Response) => {
  try {
    const data = await markTeacherCheckOutService(
      req.user.schoolId,
      req.user,
      req.body,
    );

    return res.json({
      success: true,
      data,
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

export const markTeacherLeave = async (req: Request, res: Response) => {
  try {
    const data = await markTeacherLeaveService(
      req.user.schoolId,
      req.user,
      req.body,
    );

    return res.json({
      success: true,
      data,
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

export const getTeacherSelfAttendanceHistory = async (
  req: Request,
  res: Response,
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await getTeacherAttendanceHistoryService({
      schoolId: req.user.schoolId,
      teacherId: req.user.teacherId,
      page,
      limit,
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
      status: req.query.status as string | undefined,
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

export const getTeacherAttendanceForAdmin = async (
  req: Request,
  res: Response,
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await getTeacherAttendanceHistoryService({
      schoolId: req.user.schoolId,
      teacherId: req.query.teacherId as string | undefined,
      page,
      limit,
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
      search: req.query.search as string | undefined,
      status: req.query.status as string | undefined,
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
