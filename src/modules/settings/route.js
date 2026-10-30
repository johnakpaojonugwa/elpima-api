import { Router } from "express";
import * as settingsController from "./controller.js";
import { updateSettingsSchema } from "./validation.js";
import { validate } from "../../middlewares/validate.js";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { ROLES } from "../../constants/roles.js";

export const settingsRouter = Router();

// Public: Storefront gets official WhatsApp number & contact info
settingsRouter.get("/", settingsController.getSettings);

// Super-Admin only: Update settings
settingsRouter.put(
  "/",
  requireAuth,
  requireRole(ROLES.SUPER_ADMIN),
  validate(updateSettingsSchema),
  settingsController.updateSettings
);
