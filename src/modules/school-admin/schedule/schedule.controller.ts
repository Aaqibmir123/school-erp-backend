import { Request, Response } from "express";
import * as service from "./schedule.service";

export const createSchedule = async (req: any, res: Response) => {
  try {
    const data = await service.createScheduleService(req.body, req.user);
    res.status(201).json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const getSchedules = async (req: Request, res: Response) => {
  try {
    const examId = String(req.params.examId || "");
    const data = await service.getSchedulesService(examId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateSchedule = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id || "");
    const data = await service.updateScheduleService(
      id,
      req.body,
      (req as any).user,
    );
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const deleteSchedule = async (req: Request, res: Response) => {
  try {
    await service.deleteScheduleService(String(req.params.id || ""));
    res.json({ success: true, message: "Deleted" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getClassesWithSubjects = async (req: any, res: Response) => {
  try {
    const data = await service.getClassesWithSubjectsService(req.user.schoolId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const publishExam = async (req: any, res: Response) => {
  try {
    const data = await service.publishExamService(
      String(req.params.id || ""),
      req.user.schoolId,
    );
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const getPublishedExams = async (req: any, res: Response) => {
  try {
    const data = await service.getPublishedExamsService(req.user.schoolId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getTeachersBySubject = async (req: any, res: Response) => {
  try {
    const data = await service.getTeachersBySubjectService(
      String(req.query.subjectId || ""),
      String(req.query.classId || ""),
      req.user.schoolId,
    );
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const previewSchedule = async (req: any, res: any) => {
  try {
    const data = await service.previewScheduleService(req.body, req.user);

    res.json({
      success: true,
      data,
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

export const suggestTimeSlots = async (req: any, res: any) => {
  try {
    const data = await service.suggestTimeSlotsService(req.body, req.user);

    res.json({
      success: true,
      data,
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};
