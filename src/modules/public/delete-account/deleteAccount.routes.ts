import { Router } from "express";

import { validate } from "../../../middlewares/validate.middleware";
import * as controller from "./deleteAccount.controller";
import { createDeleteAccountRequestSchema } from "./deleteAccount.validation";

const router = Router();

router.post(
  "/delete-account-requests",
  validate(createDeleteAccountRequestSchema),
  controller.createDeleteAccountRequest,
);

export default router;
