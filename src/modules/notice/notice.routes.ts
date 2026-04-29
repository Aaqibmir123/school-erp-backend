import { Router } from "express";

import { authMiddleware } from "../../middlewares/auth.middleware";
import { roleMiddleware } from "../../middlewares/role.middleware";
import * as controller from "./notice.controller";

const router = Router();

router.get("/feed", authMiddleware, controller.getNoticeFeed);

router.get("/", authMiddleware, roleMiddleware("SCHOOL_ADMIN"), controller.getNotices);
router.post("/", authMiddleware, roleMiddleware("SCHOOL_ADMIN"), controller.createNotice);
router.put("/:id", authMiddleware, roleMiddleware("SCHOOL_ADMIN"), controller.updateNotice);
router.delete("/:id", authMiddleware, roleMiddleware("SCHOOL_ADMIN"), controller.deleteNotice);

export default router;
