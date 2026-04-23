import express from "express";
import { authMiddleware } from "../../../middlewares/auth.middleware";
import { attachAcademicYear } from "../../../middlewares/setAcademicYear";
import * as controller from "./fee.controller";

const router = express.Router();

router.post("/", authMiddleware, attachAcademicYear, controller.createFee);
router.put("/:id", authMiddleware, controller.updateFee);
router.delete("/:id", authMiddleware, controller.deleteFee);
router.get("/student/:studentId", authMiddleware, controller.getFeesByStudent);

export default router;
