import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";

import { getTeacherTimetable } from "./teacher.controller";

const router = Router();

router.get("/timeTable", authMiddleware, getTeacherTimetable);
export default router;
