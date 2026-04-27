import { Router } from "express";

import { authMiddleware } from "../../../middlewares/auth.middleware";
import { roleMiddleware } from "../../../middlewares/role.middleware";
import * as controller from "./dashboard.controller";

const router = Router();

router.use(authMiddleware, roleMiddleware("SCHOOL_ADMIN"));

router.get("/summary", controller.getDashboardSummary);

export default router;
