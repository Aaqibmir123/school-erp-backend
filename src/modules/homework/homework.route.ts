import express from "express";
import {
  createHomework,
  deleteHomework,
  getStudentHomework,
  getTeacherHomework,
  updateHomework,
} from "./homework.controller";

import { authMiddleware } from "../../middlewares/auth.middleware";
import {
  bulkHomeworkCheckController,
  getHomeworkCheckController,
} from "../homeworkCheck/homeworkCheck.controller";

const router = express.Router();

/* TEACHER */
router.post("/teacher/homework", authMiddleware, createHomework);
router.get("/teacher", authMiddleware, getTeacherHomework);
router.put("/teacher/homework/:id", authMiddleware, updateHomework);
router.delete("/teacher/homework/:id", authMiddleware, deleteHomework);

/* STUDENT */
router.get("/student", authMiddleware, getStudentHomework);

/* 🔥 CHECK */
router.post("/check", authMiddleware, bulkHomeworkCheckController);
router.get("/:homeworkId", getHomeworkCheckController);

export default router;
