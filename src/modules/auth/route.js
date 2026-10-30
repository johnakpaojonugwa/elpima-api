import { Router } from "express";
import * as authController from "./controller.js";
import {
  loginSchema,
  verify2FASchema,
  enable2FASchema,
  disable2FASchema,
  regenerateBackupCodesSchema,
  changePasswordSchema,
  updateProfileSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema,
} from "./validation.js";
import { validate } from "../../middlewares/validate.js";
import { requireAuth } from "../../middlewares/auth.js";
import { authRateLimiter, refreshTokenRateLimiter } from "../../middlewares/rateLimiter.js";

export const authRouter = Router();

// Core authentication & token rotation
authRouter.post("/login", authRateLimiter, validate(loginSchema), authController.login);
authRouter.post("/2fa/verify", authRateLimiter, validate(verify2FASchema), authController.verify2FALogin);
authRouter.post("/refresh-token", refreshTokenRateLimiter, validate(refreshTokenSchema), authController.refreshToken);

// Password recovery
authRouter.post("/forgot-password", authRateLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
authRouter.post("/reset-password", authRateLimiter, validate(resetPasswordSchema), authController.resetPassword);

// Authenticated session & profile
authRouter.get("/me", requireAuth, authController.getProfile);
authRouter.patch("/me", requireAuth, validate(updateProfileSchema), authController.updateProfile);
authRouter.post("/change-password", requireAuth, validate(changePasswordSchema), authController.changePassword);
authRouter.post("/logout", requireAuth, authController.logout);
authRouter.post("/logout-all", requireAuth, authController.logoutAll);

// Authenticator App (TOTP) 2FA Endpoints
authRouter.get("/2fa/status", requireAuth, authController.get2FAStatus);
authRouter.post("/2fa/setup", requireAuth, authController.setup2FA);
authRouter.post("/2fa/enable", requireAuth, validate(enable2FASchema), authController.enable2FA);
authRouter.post("/2fa/disable", requireAuth, validate(disable2FASchema), authController.disable2FA);
authRouter.post("/2fa/backup-codes", requireAuth, validate(regenerateBackupCodesSchema), authController.regenerateBackupCodes);

// Multi-Device Session Inspection & Revocation
authRouter.get("/sessions", requireAuth, authController.listActiveSessions);
authRouter.delete("/sessions/:sessionId", requireAuth, authController.revokeSession);



