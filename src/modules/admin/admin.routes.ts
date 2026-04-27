import { Router } from "express"
import * as controller from "./admin.controller"
import { superAdminMiddleware } from "../../middlewares/superAdmin.middleware"

const router = Router()

router.get(
  "/pending-schools",
  superAdminMiddleware,
  controller.getPendingSchools
)

router.get(
  "/schools",
  superAdminMiddleware,
  controller.getAllSchools
)

router.patch(
  "/approve-school/:id",
  superAdminMiddleware,
  controller.approveSchool
)

router.patch(
  "/school-status/:id",
  superAdminMiddleware,
  controller.updateSchoolStatus
)

export default router
