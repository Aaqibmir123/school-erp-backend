import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { roleMiddleware } from "../../middlewares/role.middleware";
import * as controller from "./academicYear.controller";

const router = Router();

router.use(authMiddleware, roleMiddleware("SCHOOL_ADMIN"));

router.post("/", controller.createAcademicYear);
router.get("/", controller.getAcademicYears);
router.patch("/set-active/:id", controller.setActiveAcademicYear);

export default router;
