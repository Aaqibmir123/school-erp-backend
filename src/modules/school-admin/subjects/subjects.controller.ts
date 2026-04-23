import { Request, Response } from "express";

import {
  createSubjectsService,
  deleteSubjectService,
  getSubjectsByClassService,
  getSubjectsBySchoolService,
} from "./subjects.service";

/* CREATE SUBJECTS */

export const createSubjectsController = async (req: any, res: Response) => {
  try {
    const { classId, subjects } = req.body;

    const schoolId = req.user.schoolId;

    const data = await createSubjectsService({
      classId,
      subjects,
      schoolId,
    });

    res.json({
      success: true,
      data,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to create subjects",
    });
  }
};

/* GET SUBJECTS BY CLASS */

export const getSubjectsByClassController = async (req: any, res: Response) => {
  try {
    const { classId } = req.params;

    const schoolId = req.user.schoolId;

    const data = await getSubjectsByClassService(classId, schoolId);
    console.log({
      classId,
      schoolId,
      classIdType: typeof classId,
      schoolIdType: typeof schoolId,
    });
    res.json({
      success: true,
      data,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch subjects",
    });
  }
};

/* DELETE SUBJECT */

export const deleteSubjectController = async (req: Request, res: Response) => {
  try {
    const { subjectId } = req.params;

    await deleteSubjectService(subjectId);

    res.json({
      success: true,
      message: "Subject deleted",
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to delete subject",
    });
  }
};

/* GET ALL CLASSES WITH SUBJECTS */

export const getSubjectsController = async (req: any, res: Response) => {
  try {
    const schoolId = req.user.schoolId;

    const data = await getSubjectsBySchoolService(schoolId);

    res.json({
      success: true,
      data,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch subjects",
    });
  }
};
