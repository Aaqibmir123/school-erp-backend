import { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { successResponse } from "../../utils/apiResponse";
import {
  getStudentProgressService,
  getStudentsByClassService,
  getTeacherAcademicExamsService,
  getTeacherClasses,
} from "./teacher.service";

// ==============================
// GET MY CLASSES
// ==============================

export const getMyClasses = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const teacherId = req.user?.teacherId;
    const schoolId = req.user?.schoolId;

    if (!teacherId || !schoolId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const classes = await getTeacherClasses(teacherId, schoolId);

    return successResponse(
      res,
      classes,
      "Teacher classes fetched successfully",
    );
  } catch (err) {
    next(err);
  }
};

// ==============================
// GET STUDENT PROGRESS
// ==============================

export const getStudentProgress = async (
  req: any,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = req.user?.schoolId;

    if (!schoolId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const {
      classId,
      subjectId,
      sectionId,
      page = "1",
      limit = "20",
    } = req.query as {
      classId: string;
      subjectId: string;
      sectionId?: string;
      page?: string;
      limit?: string;
    };

    /* ================= VALIDATION ================= */

    if (!classId?.trim() || !subjectId?.trim()) {
      return res.status(400).json({
        success: false,
        message: "classId and subjectId are required",
      });
    }

    // 💣 ObjectId validation (IMPORTANT)
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid classId",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(subjectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subjectId",
      });
    }

    if (sectionId && !mongoose.Types.ObjectId.isValid(sectionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid sectionId",
      });
    }

    /* ================= PAGINATION SANITIZE ================= */

    const pageNumber = Math.max(1, Number(page) || 1);
    const limitNumber = Math.min(100, Math.max(1, Number(limit) || 20));

    /* ================= SERVICE CALL ================= */

    const result = await getStudentProgressService({
      classId,
      subjectId,
      schoolId,
      sectionId,
      page: pageNumber,
      limit: limitNumber,
    });

    /* ================= RESPONSE ================= */

    return res.status(200).json({
      success: true,
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
};

export const getStudentsByClassController = async (req: any, res: Response) => {
  try {
    const { classId, sectionId } = req.query;

    const schoolId = req.user?.schoolId;

    if (!classId) {
      return res.status(400).json({
        success: false,
        message: "classId is required",
      });
    }

    if (!schoolId) {
      return res.status(400).json({
        success: false,
        message: "schoolId missing from user",
      });
    }

    const students = await getStudentsByClassService({
      classId,
      sectionId,
      schoolId,
    });

    return res.json({
      success: true,
      data: students,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const getTeacherExams = async (req: any, res: Response) => {
  try {
    const exams = await getTeacherAcademicExamsService(req.user);

    return res.json({
      success: true,
      data: exams,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch exams",
    });
  }
};

export const getTeacherTimetableByDateController = async (
  req: any,
  res: Response,
) => {
  try {
    const teacherId = req.user.teacherId;
    const { date } = req.query;

    if (!teacherId) {
      return res.status(403).json({
        success: false,
        message: "Teacher not authorized",
      });
    }

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Date is required",
      });
    }

    const data = await getTeacherTimetableByDate(teacherId, date);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

// export const getTeacherAssignments = async (req: Request, res: Response) => {
//   try {
//     const schoolId = (req as any).user?.schoolId;

//     const teacherId = req.params.teacherId as string;
//     if (!schoolId) {
//       return res.status(400).json({
//         success: false,
//         message: "School not found in token",
//       });
//     }

//     if (!teacherId) {
//       return res.status(400).json({
//         success: false,
//         message: "Teacher ID is required",
//       });
//     }

//     const data = await teacherAssignmentService.getTeacherAssignments(
//       schoolId,
//       teacherId,
//     );

//     return res.json({
//       success: true,
//       data,
//     });
//   } catch (error: any) {
//     return res.status(500).json({
//       success: false,
//       message: error.message || "Failed to fetch assignments",
//     });
//   }
// };
