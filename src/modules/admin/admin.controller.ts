import { NextFunction, Request, Response } from "express";

import { ApiError } from "../../utils/apiError";
import * as adminService from "./admin.service";

const allowedStatuses = new Set(["PENDING", "APPROVED", "REJECTED"]);

export const getPendingSchools = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schools = await adminService.getPendingSchools();

    res.json({
      success: true,
      data: schools,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllSchools = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schools = await adminService.getAllSchools();

    res.json({
      success: true,
      data: schools,
    });
  } catch (error) {
    next(error);
  }
};

export const approveSchool = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const school = await adminService.approveSchool(req.params.id);

    res.json({
      success: true,
      data: school,
    });
  } catch (error) {
    next(error);
  }
};

export const updateSchoolStatus = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { status } = req.body as {
      status: "PENDING" | "APPROVED" | "REJECTED";
    };

    if (!allowedStatuses.has(status)) {
      throw new ApiError(400, "Invalid school status");
    }

    const school = await adminService.updateSchoolStatus(req.params.id, status);

    res.json({
      success: true,
      data: school,
    });
  } catch (error) {
    next(error);
  }
};
