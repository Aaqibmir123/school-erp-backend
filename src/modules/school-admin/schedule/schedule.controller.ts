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
    const data = await service.getSchedulesService(req.params.examId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateSchedule = async (req: Request, res: Response) => {
  try {
    const data = await service.updateScheduleService(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const deleteSchedule = async (req: Request, res: Response) => {
  try {
    await service.deleteScheduleService(req.params.id);
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
      req.params.id,
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
      req.query.subjectId,
      req.query.classId,
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
