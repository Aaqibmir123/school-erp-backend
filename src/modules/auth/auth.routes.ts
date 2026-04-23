import { Router } from "express";

import { validate } from "../../middlewares/validate.middleware";
import { createRateLimiter } from "../../middlewares/rateLimit.middleware";
import * as controller from "./auth.controller";
import {
  applySchoolSchema,
  checkUserSchema,
  firebaseLoginSchema,
  loginSchema,
  sendOtpSchema,
  setPasswordSchema,
  verifyOtpSchema,
} from "./auth.validation";

const router = Router();

const authRateLimit = createRateLimiter({
  keyPrefix: "auth",
  max: 10,
  message: "Too many authentication attempts. Please try again shortly.",
  windowMs: 60 * 1000,
});

router.post("/check-user", authRateLimit, validate(checkUserSchema), controller.checkUser);
router.post("/send-otp", authRateLimit, validate(sendOtpSchema), controller.sendOtp);
router.post("/verify-otp", authRateLimit, validate(verifyOtpSchema), controller.verifyOtp);
router.post("/login", authRateLimit, validate(loginSchema), controller.login);
router.post("/set-password", validate(setPasswordSchema), controller.setPassword);
router.post("/apply-school", validate(applySchoolSchema), controller.applySchool);
router.post(
  "/firebase-login",
  authRateLimit,
  validate(firebaseLoginSchema),
  controller.firebaseLogin,
);

export default router;
