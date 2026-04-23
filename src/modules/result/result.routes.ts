import express from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";

import { createResults, getResultsByExamController } from "./result.controller";

const router = express.Router();

router.post("/create", authMiddleware, createResults);
router.get("/", authMiddleware, getResultsByExamController);

export default router;
