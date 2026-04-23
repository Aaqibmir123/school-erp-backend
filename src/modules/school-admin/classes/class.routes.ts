import express from "express"
import {
  createClassesController,
  getClassesController,
} from "./class.controller"

import { authMiddleware } from "../../../middlewares/auth.middleware"
import { roleMiddleware } from "../../../middlewares/role.middleware"
import { UserRole } from "../../user/user.model"

const router = express.Router()

router.post(
  "/",
  authMiddleware,
  roleMiddleware(UserRole.SCHOOL_ADMIN),
  createClassesController
)

router.get(
  "/",
  authMiddleware,
  getClassesController
)

export default router