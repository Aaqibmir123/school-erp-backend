import express from "express";
import {
    createSchedule,
    deleteSchedule,
    getClassesWithSubjects,
    getPublishedExams,
    getSchedules,
    getTeachersBySubject,
    previewSchedule,
    publishExam,
    suggestTimeSlots,
    updateSchedule,
} from "./schedule.controller";

import { authMiddleware } from "../../../middlewares/auth.middleware";

const router = express.Router();

router.use(authMiddleware);

// ✅ STATIC ROUTES FIRST
router.get("/by-subject", getTeachersBySubject);
router.get("/classes/subjects", getClassesWithSubjects);
router.get("/published", getPublishedExams);
router.put("/publish/:id", publishExam);

// ✅ CRUD
router.post("/", createSchedule);
router.put("/:id", updateSchedule);
router.delete("/:id", deleteSchedule);
router.post("/preview", previewSchedule);
router.post("/suggest-time", suggestTimeSlots);

// ❌ ALWAYS LAST (DYNAMIC)
router.get("/:examId", getSchedules);

export default router;
