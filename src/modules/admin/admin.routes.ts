import { Router } from "express"
import * as controller from "./admin.controller"
import { superAdminMiddleware } from "../../middlewares/superAdmin.middleware"

const router = Router()

router.get(
  "/pending-schools",
  superAdminMiddleware,
  controller.getPendingSchools
)

router.patch(
  "/approve-school/:id",
  superAdminMiddleware,
  controller.approveSchool
)

export default router