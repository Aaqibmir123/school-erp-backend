import express from "express";
import { authMiddleware } from "../../../middlewares/auth.middleware";
import {
    getAttendanceByExamController,
    saveBulkAttendance,
} from "./attendance.controller";

const router = express.Router();

router.post("/bulk", authMiddleware, saveBulkAttendance);
router.get("/by-exam", authMiddleware, getAttendanceByExamController);

export default router;
