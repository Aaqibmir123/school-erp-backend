import { Request, Response } from "express";

import {
  previewStudentBulkService,
  importStudentBulkService,
} from "./student.bulk.service";

/* ================= PREVIEW ================= */

export const previewStudentBulk = async (req: Request, res: Response) => {
  const file = req.file;

  if (!file) {
    return res.status(400).json({
      message: "Excel file required",
    });
  }

  const result = await previewStudentBulkService(file.buffer);

  res.json(result);
};

/* ================= IMPORT ================= */

export const bulkImportStudents = async (req: Request, res: Response) => {
  try {

    const students = req.body.students;

    if (!students || !Array.isArray(students)) {
      return res.status(400).json({
        message: "Students data required",
      });
    }

    const result = await importStudentBulkService(students, req.user);

    res.json(result);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Import failed",
    });
  }
};
