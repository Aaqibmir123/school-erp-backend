import express from "express";
import { authMiddleware } from "../../../middlewares/auth.middleware";
import { roleMiddleware } from "../../../middlewares/role.middleware";
import {
  getAdmitCardStudents,
  getReleasedAdmitCards,
  previewAdmitCard,
  releaseAdmitCards,
  toggleAdmitCardApproval,
} from "./admitCard.controller";

const router = express.Router();

router.use(authMiddleware, roleMiddleware("SCHOOL_ADMIN"));

router.get("/exams/:examId/students", getAdmitCardStudents);
router.get("/released", getReleasedAdmitCards);
router.post("/preview", previewAdmitCard);
router.post("/release", releaseAdmitCards);
router.patch("/approval", toggleAdmitCardApproval);

export default router;
