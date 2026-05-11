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
import { roleMiddleware } from "../../middlewares/role.middleware";

const router = express.Router();

/* TEACHER */
router.post("/teacher/homework", authMiddleware, roleMiddleware("TEACHER"), createHomework);
router.get("/teacher", authMiddleware, roleMiddleware("TEACHER"), getTeacherHomework);
router.put("/teacher/homework/:id", authMiddleware, roleMiddleware("TEACHER"), updateHomework);
router.delete("/teacher/homework/:id", authMiddleware, roleMiddleware("TEACHER"), deleteHomework);

/* STUDENT */
router.get("/student", authMiddleware, roleMiddleware("STUDENT", "PARENT"), getStudentHomework);

/* 🔥 CHECK */
router.post("/check", authMiddleware, roleMiddleware("TEACHER"), bulkHomeworkCheckController);
router.get("/:homeworkId", authMiddleware, roleMiddleware("TEACHER"), getHomeworkCheckController);

export default router;
