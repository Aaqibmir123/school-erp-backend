import express from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";

import {
  createResults,
  getResultsByExamController,
  getResultsHistoryController,
} from "./result.controller";

const router = express.Router();

router.post("/create", authMiddleware, createResults);
router.get("/", authMiddleware, getResultsByExamController);
router.get("/history", authMiddleware, getResultsHistoryController);

export default router;
