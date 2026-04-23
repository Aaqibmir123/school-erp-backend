import { Request, Response } from "express";

import {
  createSections,
  getSections,
  deleteSection,
  getSectionsByClassService
} from "./sections.service";


/* CREATE */

export const createSectionsController = async (
  req: Request,
  res: Response
) => {

  const schoolId = req.user.schoolId;

  const { classId, sections } = req.body;

  const data = await createSections(
    schoolId,
    classId,
    sections
  );

  res.json({
    success: true,
    data
  });

};


/* GET (HISTORY + FILTER) */

export const getSectionsController = async (
  req: Request,
  res: Response
) => {

  const schoolId = req.user.schoolId;

  const classId = req.query.classId as string | undefined;

  const data = await getSections(
    schoolId,
    classId
  );

  res.json({
    success: true,
    data
  });

};


/* DELETE */

export const deleteSectionController = async (
  req: Request,
  res: Response
) => {

  const id = req.params.id as string;

  await deleteSection(id);

  res.json({
    success: true
  });

};


export const getSectionsByClassController = async (
  req: any,
  res: Response
) => {
  try {
    const { classId } = req.params;

    const schoolId = req.user.schoolId;

    const sections = await getSectionsByClassService(
      classId,
      schoolId
    );

    res.json({
      success: true,
      data: sections,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch sections",
    });
  }
};