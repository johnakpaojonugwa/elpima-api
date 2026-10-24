import { Router } from "express";
import * as analyticsController from "./controller.js";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { ROLES } from "../../constants/roles.js";

export const analyticsRouter = Router();

// Staff only: Super-Admin and Supervising Manager
analyticsRouter.get(
  "/dashboard",
  requireAuth,
  requireRole(ROLES.SUPER_ADMIN, ROLES.SUPERVISING_MANAGER),
  analyticsController.getDashboardStats
);
