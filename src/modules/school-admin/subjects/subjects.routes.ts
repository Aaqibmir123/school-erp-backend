import { Router } from "express";

import {
  createSubjectsController,
  getSubjectsController,
  getSubjectsByClassController,
  deleteSubjectController,
} from "./subjects.controller";

import { authMiddleware } from "../../../middlewares/auth.middleware";
import { roleMiddleware } from "../../../middlewares/role.middleware";

const router = Router();

/* GET ALL SUBJECTS GROUPED BY CLASS */

router.get(
  "/",
  authMiddleware,
  roleMiddleware("SCHOOL_ADMIN"),
  getSubjectsController
);

/* CREATE SUBJECTS */

router.post(
  "/",
  authMiddleware,
  roleMiddleware("SCHOOL_ADMIN"),
  createSubjectsController
);

/* GET SUBJECTS BY CLASS */

router.get(
  "/class/:classId",
  authMiddleware,
  roleMiddleware("SCHOOL_ADMIN"),
  getSubjectsByClassController
);

/* DELETE SUBJECT */

router.delete(
  "/:subjectId",
  authMiddleware,
  roleMiddleware("SCHOOL_ADMIN"),
  deleteSubjectController
);

export default router;