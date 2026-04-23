import { Request, Response } from "express";
import { StudentModel } from "./student.model";
import * as service from "./student.service";

import { downloadStudentTemplateService } from "./student.service";

export const downloadStudentTemplate = async (req: Request, res: Response) => {
  try {
    const buffer = await downloadStudentTemplateService();

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=students_template.xlsx",
    );

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    res.send(buffer);
  } catch (error) {
    res.status(500).json({
      message: "Template download failed",
    });
  }
};

export const createStudent = async (req: Request, res: Response) => {
  try {
    const schoolId = req.user.schoolId;
    const academicYearId = req.user.academicYearId;

    const student = await service.createStudentService(
      schoolId,
      academicYearId,
      req.body,
    );

    return res.status(201).json({
      success: true,
      message: "Student created successfully",
      data: student,
    });
  } catch (err: any) {
    console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
};

export const getStudents = async (req: Request, res: Response) => {
  try {
    const schoolId = req?.user?.schoolId;

    const result = await service.getStudentsService(schoolId, req.query);

    res.json(result);
  } catch (err: any) {
    res.status(500).json({
      message: err.message,
    });
  }
};

export const getStudentsByClass = async (req: any, res: Response) => {
  try {
    const { classId, sectionId, search = "" } = req.query;
    const schoolId = req.user.schoolId;

    if (!classId) {
      return res.status(400).json({
        success: false,
        message: "classId is required",
      });
    }

    const query: any = {
      schoolId,
      classId,
    };

    if (sectionId) query.sectionId = sectionId;

    // 🔥 FIXED SEARCH LOGIC
    if (search) {
      const isNumber = !isNaN(search);

      if (isNumber) {
        // 👉 roll number search
        query.rollNumber = Number(search);
      } else {
        // 👉 name search
        query.$or = [
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
        ];
      }
    }

    const students = await StudentModel.find(query)
      .select("_id firstName lastName rollNumber")
      .sort({ rollNumber: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: students,
    });
  } catch (err) {
    console.error("Get Students Error:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch students",
    });
  }
};

/* ================= UPDATE ================= */
export const updateStudent = async (req: any, res: Response) => {
  try {
    const schoolId = req.user.schoolId;
    const { id } = req.params;

    const student = await service.updateStudentService(schoolId, id, req.body);

    res.json({
      success: true,
      message: "Student updated successfully",
      data: student,
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

/* ================= DELETE ================= */
export const deleteStudent = async (req: any, res: Response) => {
  try {
    const schoolId = req.user.schoolId;
    const { id } = req.params;

    await service.deleteStudentService(schoolId, id);

    res.json({
      success: true,
      message: "Student deleted successfully",
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

export const getAllStudentsByClass = async (req: any, res: Response) => {
  try {
    const { classId, sectionId } = req.query;
    const schoolId = req.user.schoolId;

    if (!classId) {
      return res.status(400).json({
        success: false,
        message: "classId is required",
      });
    }

    const data = await service.getAllStudentsByClassService(
      schoolId,
      classId,
      sectionId,
    );

    return res.json({
      success: true,
      data,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
