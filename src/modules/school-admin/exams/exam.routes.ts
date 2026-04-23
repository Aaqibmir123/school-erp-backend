import express from "express";
import { authMiddleware } from "./../../../middlewares/auth.middleware";
import {
    createExam,
    deleteExam,
    getExams,
    updateExam,
} from "./exam.controller";

const router = express.Router();

router.post("/create", authMiddleware, createExam);
router.get("/", authMiddleware, getExams);

router.put("/exams/:id", authMiddleware, updateExam);

// 🔥 DELETE
router.delete("/exams/:id", authMiddleware, deleteExam);

export default router;
