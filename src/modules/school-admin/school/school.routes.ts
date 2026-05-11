import { Router } from "express";
import { authMiddleware } from "../../../middlewares/auth.middleware";
import { getSchool, saveSchool } from "./school.controller";

const router = Router();

router.get("/", authMiddleware, getSchool);
router.post(
  "/",
  authMiddleware,
  // School asset upload is temporarily disabled while Hostinger runtime stabilizes.
  saveSchool,
);

export default router;
