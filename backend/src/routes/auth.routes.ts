import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth";
import { authRateLimiter, passwordResetRateLimiter } from "../middleware/rateLimiters";
import { validateBody } from "../middleware/validate";
import {
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../validators/auth.validators";

const router = Router();

router.post("/login", authRateLimiter, validateBody(loginSchema), authController.login);
router.post("/refresh", authRateLimiter, authController.refresh);
router.post("/logout", authenticate, authController.logout);
router.get("/me", authenticate, authController.me);
router.post("/change-password", authenticate, validateBody(changePasswordSchema), authController.changePassword);
router.post(
  "/forgot-password",
  passwordResetRateLimiter,
  validateBody(forgotPasswordSchema),
  authController.forgotPassword,
);
router.post("/reset-password", passwordResetRateLimiter, validateBody(resetPasswordSchema), authController.resetPassword);

export default router;
