import { Request, Response } from "express";
import { getMarksByExam, upsertBulkMarks } from "./marks.service";

export const saveBulkMarks = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    const data = req.body;

    if (!data.examId || !data.subjectId || !data.classId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const result = await upsertBulkMarks(data, user);

    res.status(200).json({
      success: true,
      message: "Marks saved successfully",
      data: result,
    });
  } catch (error: any) {
    console.error("Marks Error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getMarksByExamController = async (req: Request, res: Response) => {
  try {
    const { examId, subjectId, classId } = req.query;

    // 🔥 validation
    if (!examId || !subjectId || !classId) {
      return res.status(400).json({
        success: false,
        message: "examId, subjectId, classId required",
      });
    }

    const marks = await getMarksByExam(
      examId as string,
      subjectId as string,
      classId as string,
    );

    res.status(200).json({
      success: true,
      data: marks,
    });
  } catch (error: any) {
    console.error("Get Marks Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
