import { Router } from "express";
import { authMiddleware } from "../../../middlewares/auth.middleware";
import { roleMiddleware } from "../../../middlewares/role.middleware";
import { uploadFile } from "../../../middlewares/upload.middleware";
import * as teacherController from "./teacher.controller";
import * as teacherAssignmentController from "./teacherAssignment.controller";

const router = Router();

// 🔥 CREATE TEACHER
router.post(
  "/teachers",
  authMiddleware,
  roleMiddleware("SCHOOL_ADMIN"),
  uploadFile("teachers").single("profileImage"),
  teacherController.createTeacher,
);

// 🔥 GET ALL TEACHERS
router.get(
  "/teachers",
  authMiddleware,
  roleMiddleware("SCHOOL_ADMIN"),
  teacherController.getTeachers,
);
router.put("/teacher/:id", authMiddleware, teacherController.updateTeacher);

router.delete("/teacher/:id", authMiddleware, teacherController.deleteTeacher);

router.post(
  "/teachers/assign-subject",
  authMiddleware,
  roleMiddleware("SCHOOL_ADMIN"),
  teacherAssignmentController.assignSubject,
);

// 🔥 SET PASSWORD
router.post(
  "/teachers/set-password",
  authMiddleware,
  roleMiddleware("SCHOOL_ADMIN"),
  teacherController.setTeachersPassword,
);

// 🔥 CURRENT CLASS (IMPORTANT - ABOVE DYNAMIC)
router.get(
  "/teacher/current-class",
  authMiddleware,
  teacherController.getCurrentClassController,
);

// 🔥 TEACHER ASSIGNMENTS
router.get(
  "/teacher/:teacherId",
  authMiddleware,
  teacherAssignmentController.getTeacherAssignments,
);

router.get(
  "/teacher/timetable",
  authMiddleware,
  teacherController.getTeacherTimetableByDateController,
);

router.get("/by-class", authMiddleware, teacherController.getTeachersByClass);
router.delete(
  "/assignments/:assignmentId",
  authMiddleware,
  teacherAssignmentController.removeTeacherSubjectController,
);
export default router;
