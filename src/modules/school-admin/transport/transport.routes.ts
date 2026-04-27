import { Router } from "express";

import { authMiddleware } from "../../../middlewares/auth.middleware";
import { roleMiddleware } from "../../../middlewares/role.middleware";
import { validate } from "../../../middlewares/validate.middleware";
import {
  createTransportSchema,
  updateTransportSchema,
} from "./transport.validation";
import * as controller from "./transport.controller";

const router = Router();

router.use(authMiddleware, roleMiddleware("SCHOOL_ADMIN"));

router.get("/", controller.getTransports);
router.post("/", validate(createTransportSchema), controller.createTransport);
router.put("/:id", validate(updateTransportSchema), controller.updateTransport);
router.delete("/:id", controller.deleteTransport);

export default router;
