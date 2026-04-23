import express from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import {
    createExam,
    deleteExam,
    getMyExams,
    updateExam,
} from "./exam.controller";

const router = express.Router();

router.post("/", authMiddleware, createExam);
router.get("/my", authMiddleware, getMyExams);
router.put("/:id", authMiddleware, updateExam);
router.delete("/:id", authMiddleware, deleteExam);

export default router;
