import { Response } from "express";
import * as service from "./timetable.service";

export const createTimetable = async (req: any, res: Response) => {
  try {
    const schoolId = req.user.schoolId;

    await service.createTimetableEntries(schoolId, req.body);

    return res.status(200).json({
      success: true,
      message: "✅ Timetable saved successfully",
    });
  } catch (error: any) {
    console.log("❌ CONTROLLER ERROR:", error.message);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getTimetable = async (req: any, res: Response) => {
  try {
    const schoolId = req.user.schoolId;
    const { classId } = req.params;
    const { sectionId } = req.query; // 💣 NEW

    const data = await service.getTimetable({
      schoolId,
      classId,
      sectionId,
    });

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
export const updateTimetable = async (req: any, res: Response) => {
  try {
    const schoolId = req.user.schoolId;
    const data = req.body;

    const result = await service.updateTimetableEntry(schoolId, data);

    return res.status(200).json({
      success: true,
      message: "✅ Timetable updated successfully",
      data: result,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
