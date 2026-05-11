import { Router } from "express";

import { authMiddleware } from "../../../middlewares/auth.middleware";
import { roleMiddleware } from "../../../middlewares/role.middleware";
import { uploadFile } from "../../../middlewares/upload.middleware";
import * as teacherAssignmentController from "./teacherAssignment.controller";
import * as teacherController from "./teacher.controller";

const router = Router();

router.post(
  "/teachers",
  authMiddleware,
  roleMiddleware("SCHOOL_ADMIN"),
  uploadFile("teachers").single("profileImage"),
  teacherController.createTeacher,
);

router.get(
  "/teachers",
  authMiddleware,
  roleMiddleware("SCHOOL_ADMIN"),
  teacherController.getTeachers,
);

router.post(
  "/teachers/assign-subject",
  authMiddleware,
  roleMiddleware("SCHOOL_ADMIN"),
  teacherAssignmentController.assignSubject,
);

router.get(
  "/teachers/:teacherId/assignments",
  authMiddleware,
  roleMiddleware("SCHOOL_ADMIN"),
  teacherAssignmentController.getTeacherAssignments,
);

router.put(
  "/teacher/:id",
  authMiddleware,
  roleMiddleware("SCHOOL_ADMIN"),
  teacherController.updateTeacher,
);

router.patch(
  "/teacher/:id/status",
  authMiddleware,
  roleMiddleware("SCHOOL_ADMIN"),
  teacherController.updateTeacherStatus,
);

router.delete(
  "/teacher/:id",
  authMiddleware,
  roleMiddleware("SCHOOL_ADMIN"),
  teacherController.deleteTeacher,
);

router.get(
  "/teacher/me",
  authMiddleware,
  roleMiddleware("TEACHER"),
  teacherController.getTeacherProfile,
);

router.put(
  "/teacher/me",
  authMiddleware,
  roleMiddleware("TEACHER"),
  uploadFile("teachers").single("profileImage"),
  teacherController.updateTeacherProfile,
);

router.get(
  "/teacher/current-class",
  authMiddleware,
  roleMiddleware("TEACHER"),
  teacherController.getCurrentClassController,
);

router.get(
  "/teacher/timetable",
  authMiddleware,
  roleMiddleware("TEACHER"),
  teacherController.getTeacherTimetableByDateController,
);

router.get(
  "/by-class",
  authMiddleware,
  roleMiddleware("SCHOOL_ADMIN"),
  teacherController.getTeachersByClass,
);

router.delete(
  "/assignments/:assignmentId",
  authMiddleware,
  roleMiddleware("SCHOOL_ADMIN"),
  teacherAssignmentController.removeTeacherSubjectController,
);

export default router;
