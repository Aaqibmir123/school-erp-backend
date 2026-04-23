import { Request, Response } from "express";
import * as periodService from "./period.service";

export const createPeriod = async (req: Request, res: Response) => {
  try {
    const schoolId = req?.user?.schoolId;
    const { startTime, endTime, type } = req.body;

    if (!startTime || !endTime) {
      return res.status(400).json({
        message: "startTime and endTime required",
      });
    }

    const toMinutes = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };

    if (toMinutes(endTime) <= toMinutes(startTime)) {
      return res.status(400).json({
        message: "Invalid time range",
      });
    }

    const period = await periodService.createPeriod(schoolId, {
      startTime,
      endTime,
      type,
    });

    res.status(201).json({
      success: true,
      message: "Created",
      period,
    });
  } catch (error: any) {
    res.status(500).json({
      message: error.message || "Failed",
    });
  }
};

export const getPeriods = async (req: Request, res: Response) => {
  try {
    const schoolId = req.user.schoolId;
    const periods = await periodService.getPeriods(schoolId);

    res.json(periods);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch periods" });
  }
};

export const deletePeriod = async (req: Request, res: Response) => {
  try {
    const schoolId = req.user.schoolId;
    const { id } = req.params;
    const { forceDelete } = req.body;

    const result = await periodService.deletePeriod(id, schoolId, forceDelete);

    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || "Delete failed",
    });
  }
};
