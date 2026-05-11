import express from "express";
import { roleMiddleware } from "../../middlewares/role.middleware";
import {
  getAttendanceHistory,
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
router.post("/", roleMiddleware("TEACHER"), markAttendance);
router.get("/class", roleMiddleware("TEACHER", "SCHOOL_ADMIN"), getClassAttendance);
router.get("/history", roleMiddleware("TEACHER", "SCHOOL_ADMIN"), getAttendanceHistory);

/* =========================
   👨‍👩‍👧 STUDENT ROUTES
========================= */
router.get("/student/today", roleMiddleware("PARENT", "STUDENT"), getStudentTodayAttendance);
router.get("/student", roleMiddleware("PARENT", "STUDENT"), getStudentAttendance);
router.get("/student/summary", roleMiddleware("PARENT", "STUDENT"), getStudentSummary);

export default router;
