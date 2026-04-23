import { NextFunction, Request, Response } from "express";
import * as service from "./fee.service";

/* ================= CREATE ================= */

export const createFee = async (
  req: any,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = req.user.schoolId;

    const fee = await service.createFeeService({
      ...req.body,
      schoolId,
      academicYearId: req.academicYearId,
    });

    return res.status(201).json({
      success: true,
      data: fee,
    });
  } catch (err) {
    next(err);
  }
};

/* ================= UPDATE ================= */

export const updateFee = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const fee = await service.updateFeeService(req.params.id, req.body);

    return res.json({
      success: true,
      data: fee,
    });
  } catch (err) {
    next(err);
  }
};

/* ================= DELETE ================= */

export const deleteFee = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    await service.deleteFeeService(req.params.id);

    return res.json({
      success: true,
      message: "Deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

/* ================= GET ================= */

export const getFeesByStudent = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = await service.getFeesByStudentService(req.params.studentId);

    return res.json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};
