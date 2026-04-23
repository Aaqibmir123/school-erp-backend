import express from "express";
import {
  markAttendance,
  getStudentTodayAttendance,
  getStudentSummary,
  getStudentAttendance,
  getClassAttendance,
} from "./attendance.controller";
import { authMiddleware } from "../../../src/middlewares/auth.middleware";

const router = express.Router();

/* 🔒 ALL ROUTES PROTECTED */
router.use(authMiddleware);

/* =========================
   👨‍🏫 TEACHER ROUTES
========================= */
router.post("/", markAttendance);
router.get("/class", getClassAttendance);

/* =========================
   👨‍👩‍👧 STUDENT ROUTES
========================= */
router.get("/student/today", getStudentTodayAttendance);
router.get("/student", getStudentAttendance);
router.get("/student/summary", getStudentSummary);

export default router;
