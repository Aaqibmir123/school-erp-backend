import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { roleMiddleware } from "../../middlewares/role.middleware";
import {
    getFeesByStudent,
    getClassTestRecords,
    getMyMarks,
    getStudentDashboard,
    getStudentExamList,
    getStudentToday,
    getStudentWeekly,
} from "./student.controller";

const router = Router();

router.get(
  "/dashboard",
  authMiddleware,
  roleMiddleware("PARENT", "STUDENT"),
  getStudentDashboard,
);

/* 🔥 STUDENT ROUTES */
router.get("/today", authMiddleware, roleMiddleware("PARENT", "STUDENT"), getStudentToday);
router.get("/weekly", authMiddleware, roleMiddleware("PARENT", "STUDENT"), getStudentWeekly);
router.get("/exams", authMiddleware, roleMiddleware("PARENT", "STUDENT"), getStudentExamList);
router.get("/my-marks", authMiddleware, roleMiddleware("PARENT", "STUDENT"), getMyMarks);
router.get(
  "/test-records",
  authMiddleware,
  roleMiddleware("PARENT", "STUDENT"),
  getClassTestRecords,
);
router.get("/fees", authMiddleware, roleMiddleware("PARENT", "STUDENT"), getFeesByStudent);

export default router;
