import { Router } from "express"

import {
  createSectionsController,
  getSectionsController,
  deleteSectionController,
  getSectionsByClassController
} from "./sections.controller"

import { authMiddleware } from "../../../middlewares/auth.middleware"
import { roleMiddleware } from "../../../middlewares/role.middleware"
import { UserRole } from "../../user/user.model"

const router = Router()


router.post(
  "/",
  authMiddleware,
  roleMiddleware(UserRole.SCHOOL_ADMIN),
  createSectionsController
)


router.get(
  "/",
  authMiddleware,
  roleMiddleware(UserRole.SCHOOL_ADMIN),
  getSectionsController
)


router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware(UserRole.SCHOOL_ADMIN),
  deleteSectionController
)

router.get(
  "/class/:classId",
  authMiddleware,
  roleMiddleware("SCHOOL_ADMIN"),
  getSectionsByClassController
);


export default router