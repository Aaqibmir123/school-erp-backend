import express from "express";
import { authMiddleware } from "../../../middlewares/auth.middleware";
import { getMarksByExamController, saveBulkMarks } from "./marks.controller";

const router = express.Router();

router.post("/bulk", authMiddleware, saveBulkMarks);
router.get("/by-exam", authMiddleware, getMarksByExamController);

export default router;
