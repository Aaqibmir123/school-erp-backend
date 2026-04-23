import express from "express"
import * as periodController from "./period.controller"
import { authMiddleware } from "../../../middlewares/auth.middleware"

const router = express.Router()


router.post("/", authMiddleware, periodController.createPeriod)
router.get("/", authMiddleware, periodController.getPeriods)
router.delete("/:id", authMiddleware, periodController.deletePeriod)

export default router