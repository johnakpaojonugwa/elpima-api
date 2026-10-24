import { Router } from "express";
import * as authController from "./controller.js";
import { loginSchema, changePasswordSchema, updateProfileSchema } from "./validation.js";
import { validate } from "../../middlewares/validate.js";
import { requireAuth } from "../../middlewares/auth.js";
import { authRateLimiter } from "../../middlewares/rateLimiter.js";

export const authRouter = Router();

authRouter.post("/login", authRateLimiter, validate(loginSchema), authController.login);
authRouter.get("/me", requireAuth, authController.getProfile);
authRouter.patch("/me", requireAuth, validate(updateProfileSchema), authController.updateProfile);
authRouter.post("/change-password", requireAuth, validate(changePasswordSchema), authController.changePassword);
authRouter.post("/logout", requireAuth, authController.logout);
