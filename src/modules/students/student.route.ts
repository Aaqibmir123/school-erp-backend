import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import {
    getFeesByStudent,
    getMyMarks,
    getStudentDashboard,
    getStudentExamList,
    getStudentToday,
    getStudentWeekly,
} from "./student.controller";

const router = Router();

router.get("/dashboard", authMiddleware, getStudentDashboard);

/* 🔥 STUDENT ROUTES */
router.get("/today", authMiddleware, getStudentToday);
router.get("/weekly", authMiddleware, getStudentWeekly);
router.get("/exams", authMiddleware, getStudentExamList);
router.get("/my-marks", authMiddleware, getMyMarks);
router.get("/fees", authMiddleware, getFeesByStudent);

export default router;
