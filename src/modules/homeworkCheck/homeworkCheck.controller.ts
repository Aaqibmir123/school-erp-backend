import { Request, Response } from "express";
import {
  bulkHomeworkCheckService,
  getHomeworkCheckService,
} from "./homeworkCheck.service";

export const bulkHomeworkCheckController = async (req: any, res: Response) => {
  try {
    const { homeworkId, classId, subjectId, students, sectionId } = req.body;

    const { schoolId, teacherId } = req.user;

    // 🔥 BASIC VALIDATION
    if (!homeworkId || !classId || !subjectId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    if (!students || !Array.isArray(students)) {
      return res.status(400).json({
        success: false,
        message: "Students data is required",
      });
    }

    const data = await bulkHomeworkCheckService({
      schoolId,
      teacherId,
      homeworkId,
      classId,
      subjectId,
      students,
      sectionId,
    });

    return res.json({
      success: true,
      message: data.message,
      data: data.result,
    });
  } catch (err: any) {
    console.error("Homework Check Error:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const getHomeworkCheckController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { homeworkId } = req.params;
    console.log("homework");

    if (!homeworkId) {
      return res.status(400).json({
        success: false,
        message: "homeworkId is required",
      });
    }

    const data = await getHomeworkCheckService({ homeworkId });

    return res.json({
      success: true,
      data,
    });
  } catch (err: any) {
    console.error("Get Homework Check Error:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
