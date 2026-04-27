import { Request, Response } from "express";
import * as service from "./academicYear.service";

/* CREATE */

export const createAcademicYear = async (
  req: any,
  res: Response
) => {

  try {

    const schoolId = req.user.schoolId;

    const { name } = req.body;

    const data = await service.createAcademicYearService(
      schoolId,
      name
    );

    res.json({
      success: true,
      data,
    });

  } catch {

    res.status(500).json({
      success: false,
      message: "Failed to create academic year",
    });

  }
};

/* GET ALL */

export const getAcademicYears = async (
  req: any,
  res: Response
) => {

  try {

    const schoolId = req.user.schoolId;

    const data = await service.getAcademicYearsService(
      schoolId
    );

    res.json({
      success: true,
      data,
    });

  } catch {

    res.status(500).json({
      success: false,
      message: "Failed to fetch academic years",
    });

  }
};

export const setActiveAcademicYear = async (
  req: any,
  res: Response
) => {
  try {
    const schoolId = req.user.schoolId;
    const { id } = req.params;

    const data = await service.setActiveAcademicYearService(schoolId, id);

    res.json({
      success: true,
      data,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to update academic year",
    });
  }
};
