import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { roleMiddleware } from "../../middlewares/role.middleware";
import { getMyAdmitCards } from "./admitCard.controller";

const router = Router();

router.get("/", authMiddleware, roleMiddleware("PARENT", "STUDENT"), getMyAdmitCards);

export default router;
