import express from "express";
import { authMiddleware } from "../../../middlewares/auth.middleware";
import {
  getMarksByExamController,
  getMarksHistoryController,
  saveBulkMarks,
} from "./marks.controller";

const router = express.Router();

router.post("/bulk", authMiddleware, saveBulkMarks);
router.get("/by-exam", authMiddleware, getMarksByExamController);
router.get("/history", authMiddleware, getMarksHistoryController);

export default router;
