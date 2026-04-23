import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import {
  getMyClasses,
  getStudentProgress,
  getStudentsByClassController,
  getTeacherExams,
} from "./teacher.controller";

const router = Router();

router.get("/my-classes", authMiddleware, getMyClasses);

router.get("/student-progress", authMiddleware, getStudentProgress);

router.get("/by-class", authMiddleware, getStudentsByClassController);

router.get("/exams", authMiddleware, getTeacherExams);

export default router;
