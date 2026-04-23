import express from "express";
import { authMiddleware } from "../../../middlewares/auth.middleware";
import * as controller from "./timetable.controller";

const router = express.Router();

router.post("/", authMiddleware, controller.createTimetable);
router.get("/:classId", authMiddleware, controller.getTimetable);
router.put("/update", authMiddleware, controller.updateTimetable);
export default router;
