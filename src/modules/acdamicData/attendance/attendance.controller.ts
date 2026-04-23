import { Request, Response } from "express";
import {
  getAttendanceByExam,
  upsertBulkAttendance,
} from "./attendance.service";

export const saveBulkAttendance = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    console.log("attendenacehitted");
    const result = await upsertBulkAttendance(req.body, user);

    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getAttendanceByExamController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { examId, subjectId } = req.query;

    const data = await getAttendanceByExam(
      examId as string,
      subjectId as string,
    );

    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
