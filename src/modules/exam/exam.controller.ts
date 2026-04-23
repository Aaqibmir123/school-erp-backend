import { Request, Response } from "express";
import { errorResponse, successResponse } from "../../utils/apiResponse";
import {
  createExamService,
  deleteExamService,
  getMyExamsService,
  updateExamService,
} from "./exam.service";

export const createExam = async (req: Request, res: Response) => {
  try {
    // validateCreateExams(req.body);

    const exam = await createExamService(req.body, req.user);

    return successResponse(res, exam, "Exam created", 201);
  } catch (err: any) {
    return errorResponse(res, err.message, 400);
  }
};

export const getMyExams = async (req: any, res: Response) => {
  try {
    const teacherId = req?.user?.teacherId;

    if (!teacherId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const exams = await getMyExamsService(teacherId);

    return res.status(200).json({
      success: true,
      message: "Exam list fetched successfully",
      data: exams,
    });
  } catch (err: any) {
    console.error("❌ Get Exams Error:", err);

    return res.status(500).json({
      success: false,
      message: err.message || "Server error",
    });
  }
};

export const updateExam = async (req: Request, res: Response) => {
  try {
    const exam = await updateExamService(req.params.id, req.body);
    return successResponse(res, exam, "Exam updated");
  } catch (err: any) {
    return errorResponse(res, err.message);
  }
};

/* ================= DELETE ================= */
export const deleteExam = async (req: Request, res: Response) => {
  try {
    await deleteExamService(req.params.id);
    return successResponse(res, null, "Exam deleted");
  } catch (err: any) {
    return errorResponse(res, err.message);
  }
};
