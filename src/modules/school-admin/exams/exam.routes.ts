import express from "express";
import { authMiddleware } from "./../../../middlewares/auth.middleware";
import { attachAcademicYear } from "./../../../middlewares/setAcademicYear";
import {
    createExam,
    deleteExam,
    getExams,
    updateExam,
} from "./exam.controller";

const router = express.Router();

router.post("/create", authMiddleware, attachAcademicYear, createExam);
router.get("/", authMiddleware, attachAcademicYear, getExams);

router.put("/exams/:id", authMiddleware, attachAcademicYear, updateExam);

// 🔥 DELETE
router.delete("/exams/:id", authMiddleware, attachAcademicYear, deleteExam);

export default router;
