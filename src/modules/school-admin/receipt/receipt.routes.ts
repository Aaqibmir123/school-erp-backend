import { Router } from "express";
import { authMiddleware } from "../../../middlewares/auth.middleware";
import { roleMiddleware } from "../../../middlewares/role.middleware";
import { generateReceipt } from "./receipt.controller";
const router = Router();

router.post(
  "/generate-receipt",
  authMiddleware,
  roleMiddleware("SCHOOL_ADMIN"),
  generateReceipt,
);

export default router;
