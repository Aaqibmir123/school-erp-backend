import { Router } from "express";
import * as controller from "./academicYear.controller";

const router = Router();

router.post("/", controller.createAcademicYear);

router.get("/", controller.getAcademicYears);

export default router;