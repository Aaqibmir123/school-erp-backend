import { Router } from "express";
import rateLimit from "express-rate-limit";

import { validate } from "../../middlewares/validate.middleware";
import * as controller from "./auth.controller";
import {
  applySchoolSchema,
  checkUserSchema,
  loginSchema,
  setPasswordSchema,
} from "./auth.validation";

const router = Router();

const buildLimiter = (limit: number) =>
  rateLimit({
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    windowMs: 15 * 60 * 1000,
    message: "Too many attempts, try later",
    handler: (_req, res, _next, options) => {
      res.status(options.statusCode).json({
        success: false,
        message: String(options.message || "Too many attempts, try later"),
        data: null,
      });
    },
  });

const authRateLimit = buildLimiter(10);
const otpSendRateLimit = buildLimiter(5);
const otpVerifyRateLimit = buildLimiter(10);

const refreshRateLimit = buildLimiter(60);

router.post("/check-user", authRateLimit, validate(checkUserSchema), controller.checkUser);
router.post("/login", authRateLimit, validate(loginSchema), controller.login);
router.post("/refresh", refreshRateLimit, controller.refreshSession);
router.post("/logout", controller.logout);
router.post("/apply-school", validate(applySchoolSchema), controller.applySchool);

export default router;
