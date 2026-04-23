import { NextFunction, Response } from "express";
import * as service from "./receipt.service";

export const generateReceipt = async (
  req: any,
  res: Response,
  next: NextFunction,
) => {
  try {
    const receipt = await service.generateReceiptService({
      studentId: req.body.studentId,
      feeIds: req.body.feeIds,
      schoolId: req.user.schoolId,
      adminId: req.user.id,
    });

    return res.json({
      success: true,
      data: receipt,
    });
  } catch (err) {
    next(err);
  }
};
