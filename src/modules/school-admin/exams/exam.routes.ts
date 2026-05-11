import express from "express";
import { authMiddleware } from "./../../../middlewares/auth.middleware";
import { attachAcademicYear } from "./../../../middlewares/setAcademicYear";
import {
  createExam,
  deleteExam,
  getExams,
  toggleMarksCardApproval,
  updateExam,
} from "./exam.controller";

const router = express.Router();

router.post("/create", authMiddleware, attachAcademicYear, createExam);
router.get("/", authMiddleware, attachAcademicYear, getExams);
router.put("/exams/:id", authMiddleware, attachAcademicYear, updateExam);
router.patch(
  "/exams/:id/marks-card-approval",
  authMiddleware,
  attachAcademicYear,
  toggleMarksCardApproval,
);

// DELETE
router.delete("/exams/:id", authMiddleware, attachAcademicYear, deleteExam);

export default router;
