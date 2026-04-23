import { Response } from "express";
import { StudentModel } from "../school-admin/student/student.model";
import * as service from "./homework.service";

/* CREATE */
export const createHomework = async (req: any, res: Response) => {
  try {
    const { teacherId, schoolId } = req.user;

    const data = await service.createHomeworkService(
      teacherId,
      schoolId,
      req.body,
    );

    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

/* TEACHER */
export const getTeacherHomework = async (req: any, res: Response) => {
  try {
    const { teacherId, schoolId } = req.user;
    const data = await service.getTeacherHomeworkService(teacherId, schoolId);

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

/* UPDATE */
export const updateHomework = async (req: any, res: Response) => {
  try {
    const { teacherId, schoolId } = req.user;
    const { id } = req.params;

    const data = await service.updateHomeworkService(
      teacherId,
      schoolId,
      id,
      req.body,
    );

    res.json({
      success: true,
      message: "Homework updated",
      data,
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

/* DELETE 🔥 */
export const deleteHomework = async (req: any, res: Response) => {
  try {
    const { teacherId, schoolId } = req.user;
    const { id } = req.params;

    await service.deleteHomeworkService(teacherId, schoolId, id);

    res.json({
      success: true,
      message: "Homework deleted successfully",
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

/* STUDENT */

export const getStudentHomework = async (req: any, res: Response) => {
  try {
    const { schoolId, role, id, phone } = req.user;

    let student: any = null;

    /* ================= STUDENT ================= */
    if (role === "STUDENT") {
      student = await StudentModel.findOne({
        userId: id,
        schoolId,
      })
        .select("classId sectionId")
        .lean();
    }

    /* ================= PARENT ================= */
    if (role === "PARENT") {
      // ⚠️ default first child
      student = await StudentModel.findOne({
        parentPhone: phone,
        schoolId,
      })
        .select("classId sectionId")
        .lean();
    }

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const data = await service.getStudentHomeworkService(
      schoolId,
      student.classId.toString(),
      student.sectionId?.toString(),
    );

    return res.json({
      success: true,
      message: "Homework fetched",
      data,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
