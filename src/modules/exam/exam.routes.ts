import express from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { roleMiddleware } from "../../middlewares/role.middleware";
import {
    createExam,
    deleteExam,
    getMyExams,
    updateExam,
} from "./exam.controller";

const router = express.Router();

router.post("/", authMiddleware, roleMiddleware("TEACHER", "SCHOOL_ADMIN"), createExam);
router.get("/my", authMiddleware, roleMiddleware("TEACHER"), getMyExams);
router.put("/:id", authMiddleware, roleMiddleware("TEACHER", "SCHOOL_ADMIN"), updateExam);
router.delete("/:id", authMiddleware, roleMiddleware("TEACHER", "SCHOOL_ADMIN"), deleteExam);

export default router;
