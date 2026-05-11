import express from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { roleMiddleware } from "../../middlewares/role.middleware";

import {
    createResults,
    getMidTermMarksCardPreviewController,
    getResultsByExamController,
    getResultsHistoryController,
} from "./result.controller";

const router = express.Router();

router.post("/create", authMiddleware, roleMiddleware("TEACHER", "SCHOOL_ADMIN"), createResults);
router.get("/", authMiddleware, roleMiddleware("TEACHER", "SCHOOL_ADMIN"), getResultsByExamController);
router.get(
  "/history",
  authMiddleware,
  roleMiddleware("TEACHER", "SCHOOL_ADMIN"),
  getResultsHistoryController,
);
router.get(
  "/marks-card",
  authMiddleware,
  roleMiddleware("TEACHER", "SCHOOL_ADMIN", "PARENT", "STUDENT"),
  getMidTermMarksCardPreviewController,
);

export default router;
