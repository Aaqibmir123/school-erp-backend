import { Router } from "express";
import { authMiddleware } from "../../../middlewares/auth.middleware";
import { generateReceipt } from "./receipt.controller";
const router = Router();

router.post("/generate-receipt", authMiddleware, generateReceipt);

export default router;
