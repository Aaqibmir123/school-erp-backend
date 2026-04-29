import { Request, Response } from "express";
import * as teacherService from "./teacher.service";
import { uploadBufferToCloudinary } from "../../../utils/cloudinary";

/* =========================
   CREATE TEACHER
========================= */
export const createTeacher = async (req: any, res: Response) => {
  try {
    const schoolId = req.user.schoolId;

    const payload = {
      ...req.body,
    };

    if (req.file) {
      payload.profileImage = await uploadBufferToCloudinary(
        req.file,
        "teachers",
      );
    }

    const result = await teacherService.createTeacher(schoolId, payload);

    return res.status(201).json({
      success: true,
      data: result,
      message: "Teacher created successfully",
    });
  } catch (err: any) {
    console.error("Create teacher error:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* =========================
   GET ALL TEACHERS
========================= */
export const getTeachers = async (req: any, res: Response) => {
  try {
    const schoolId = req.user.schoolId;
    const status =
      typeof req.query?.status === "string" ? req.query.status : undefined;

    const data = await teacherService.getTeachers(schoolId, status);

    return res.json({
      success: true,
      data,
    });
  } catch (err: any) {
    console.error("Get teachers error:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* =========================
   GET TEACHER PROFILE
========================= */
export const getTeacherProfile = async (req: any, res: Response) => {
  try {
    const teacherId =
      req?.user?.teacherId ||
      (await teacherService.getTeacherByUserId(req?.user?.id))?._id?.toString?.();

    if (!teacherId) {
      return res.status(403).json({
        success: false,
        message: "Teacher not authorized",
      });
    }

    const data = await teacherService.getTeacherProfileByTeacherId(teacherId);

    return res.json({
      success: true,
      data,
    });
  } catch (err: any) {
    console.error("Get teacher profile error:", err);

    return res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch profile",
    });
  }
};

/* =========================
   SET PASSWORD
========================= */
export const setTeachersPassword = async (req: any, res: Response) => {
  try {
    const schoolId = req.user.schoolId;
    const { password } = req.body;

    await teacherService.setTeachersPassword(schoolId, password);

    return res.json({
      success: true,
      message: "Password set for all teachers",
    });
  } catch (err: any) {
    console.error("Set password error:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* =========================
   CURRENT CLASS API
========================= */

export const getCurrentClassController = async (
  req: Request,
  res: Response,
) => {
  try {
    const teacherId = req?.user?.teacherId;

    if (!teacherId) {
      return res.status(403).json({
        success: false,
        message: "Teacher not authorized",
      });
    }

    const data = await teacherService.getCurrentClassService(teacherId);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error in current class API:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

/* =========================
   GET TIMETABLE BY DATE
========================= */
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

    const data = await teacherService.getTeacherTimetableByDate(
      teacherId,
      date,
    );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error fetching timetable:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

export const getTeachersByClass = async (req: any, res: Response) => {
  try {
    const schoolId = req.user.schoolId;
    const { classId } = req.query;

    const teachers = await teacherService.getTeachersByClassService(
      schoolId,
      classId,
    );

    return res.status(200).json({
      success: true,
      teachers,
    });
  } catch (err: any) {
    return res.status(500).json({
      message: err.message || "Failed to fetch teachers",
    });
  }
};

/* =========================
   UPDATE TEACHER
========================= */
export const updateTeacher = async (req: any, res: Response) => {
  try {
    const schoolId = req.user.schoolId;
    const { id } = req.params;

    const updated = await teacherService.updateTeacherService(
      schoolId,
      id,
      req.body,
    );

    return res.status(200).json({
      success: true,
      data: updated,
      message: "Teacher updated successfully",
    });
  } catch (err: any) {
    console.error("Update teacher error:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* =========================
   UPDATE TEACHER PROFILE
========================= */
export const updateTeacherProfile = async (req: any, res: Response) => {
  try {
    const teacherId =
      req?.user?.teacherId ||
      (await teacherService.getTeacherByUserId(req?.user?.id))?._id?.toString?.();

    if (!teacherId) {
      return res.status(403).json({
        success: false,
        message: "Teacher not authorized",
      });
    }

    const payload = {
      ...req.body,
    };

    if (req.file) {
      payload.profileImage = await uploadBufferToCloudinary(
        req.file,
        "teachers",
      );
    }

    const updated = await teacherService.updateTeacherProfileService(
      teacherId,
      payload,
    );

    return res.status(200).json({
      success: true,
      data: updated,
      message: "Profile updated successfully",
    });
  } catch (err: any) {
    console.error("Update teacher profile error:", err);

    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Failed to update profile",
    });
  }
};

/* =========================
   DELETE TEACHER
========================= */
export const deleteTeacher = async (req: any, res: Response) => {
  try {
    const schoolId = req.user.schoolId;
    const { id } = req.params;

    await teacherService.deleteTeacherService(schoolId, id);

    return res.status(200).json({
      success: true,
      message: "Teacher deleted successfully",
    });
  } catch (err: any) {
    console.error("Delete teacher error:", err);

    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Internal Server Error",
    });
  }
};

export const updateTeacherStatus = async (req: any, res: Response) => {
  try {
    const schoolId = req.user.schoolId;
    const { id } = req.params;
    const { status } = req.body;

    if (!["active", "disabled"].includes(String(status))) {
      return res.status(400).json({
        success: false,
        message: "Status must be active or disabled",
      });
    }

    const data = await teacherService.updateTeacherAccountStatusService(
      schoolId,
      id,
      status,
    );

    return res.status(200).json({
      success: true,
      data,
      message:
        status === "active"
          ? "Teacher account enabled successfully"
          : "Teacher account disabled successfully",
    });
  } catch (err: any) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Failed to update teacher status",
    });
  }
};
