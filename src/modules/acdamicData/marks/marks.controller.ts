import { Request, Response } from "express";
import {
  getMarksByExam,
  getMarksHistory,
  upsertBulkMarks,
} from "./marks.service";

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

export const getMarksHistoryController = async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const result = await getMarksHistory({
      schoolId: user.schoolId,
      classId: req.query.classId as string | undefined,
      sectionId: req.query.sectionId as string | undefined,
      subjectId: req.query.subjectId as string | undefined,
      studentId: req.query.studentId as string | undefined,
      examId: req.query.examId as string | undefined,
      search: req.query.search as string | undefined,
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      data: result.data,
      meta: result.meta,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
