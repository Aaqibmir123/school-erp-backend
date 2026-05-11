import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { roleMiddleware } from "../../middlewares/role.middleware";
import {
  getMyClasses,
  getStudentProgress,
  getStudentsByClassController,
  getTeacherExams,
} from "./teacher.controller";

const router = Router();

router.get("/my-classes", authMiddleware, roleMiddleware("TEACHER"), getMyClasses);

router.get(
  "/student-progress",
  authMiddleware,
  roleMiddleware("TEACHER"),
  getStudentProgress,
);

router.get("/by-class", authMiddleware, roleMiddleware("TEACHER"), getStudentsByClassController);

router.get("/exams", authMiddleware, roleMiddleware("TEACHER"), getTeacherExams);

export default router;
