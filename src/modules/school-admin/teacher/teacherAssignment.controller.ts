import { Request, Response } from "express";
import teacherAssignmentModel from "./teacherAssignment.model";
import * as teacherAssignmentService from "./teacherAssignment.service";
/* ASSIGN SUBJECT */

export const assignSubject = async (req: Request, res: Response) => {
  try {
    const schoolId = (req as any).user?.schoolId;

    if (!schoolId) {
      return res.status(400).json({
        success: false,
        message: "School not found in token",
      });
    }

    const result = await teacherAssignmentService.assignSubject(
      schoolId,
      req.body,
    );

    return res.status(201).json({
      success: true,
      data: result,
      message: "Assigned Subject Successfully",
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to assign subject",
    });
  }
};

/* GET TEACHER ASSIGNMENTS */

export const getTeacherAssignments = async (req: Request, res: Response) => {
  try {
    const schoolId = (req as any).user?.schoolId;

    const teacherId = req.params.teacherId as string;
    if (!schoolId) {
      return res.status(400).json({
        success: false,
        message: "School not found in token",
      });
    }

    if (!teacherId) {
      return res.status(400).json({
        success: false,
        message: "Teacher ID is required",
      });
    }

    const data = await teacherAssignmentService.getTeacherAssignments(
      schoolId,
      teacherId,
    );

    return res.json({
      success: true,
      data,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch assignments",
    });
  }
};

/* DELETE TEACHER ASSIGNMENT */

export const removeTeacherSubjectController = async (
  req: any,
  res: Response,
) => {
  try {
    const { assignmentId } = req.params;

    // ✅ SAFE BODY (IMPORTANT)
    const forceDelete = req.body?.forceDelete || false;

    if (!assignmentId) {
      return res.status(400).json({
        success: false,
        message: "Assignment ID is required",
      });
    }

    const assignment = await teacherAssignmentModel.findById(assignmentId);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    await teacherAssignmentService.removeTeacherSubject({
      teacherId: assignment.teacherId,
      subjectId: assignment.subjectId,
      forceDelete,
    });

    await teacherAssignmentModel.findByIdAndDelete(assignmentId);

    return res.status(200).json({
      success: true,
      message: "Assignment deleted successfully",
    });
  } catch (err: any) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message,
      requiresConfirmation: err.requiresConfirmation || false,
    });
  }
};
