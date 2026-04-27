import express from "express";

import { roleMiddleware } from "../../middlewares/role.middleware";
import {
  getTeacherAttendanceForAdmin,
  getTeacherSelfAttendanceHistory,
  markTeacherCheckIn,
  markTeacherCheckOut,
  markTeacherLeave,
} from "./teacherAttendance.controller";

const router = express.Router();

router.post("/self/check-in", roleMiddleware("TEACHER"), markTeacherCheckIn);
router.post("/self/check-out", roleMiddleware("TEACHER"), markTeacherCheckOut);
router.post("/self/leave", roleMiddleware("TEACHER"), markTeacherLeave);
router.get("/self/history", roleMiddleware("TEACHER"), getTeacherSelfAttendanceHistory);
router.get("/teacher-history", roleMiddleware("ADMIN", "SCHOOL_ADMIN"), getTeacherAttendanceForAdmin);

export default router;
