import { Router } from "express";
import * as auditController from "./controller.js";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { ROLES } from "../../constants/roles.js";

export const auditRouter = Router();

// Super-Admin only
auditRouter.use(requireAuth, requireRole(ROLES.SUPER_ADMIN));

auditRouter.get("/", auditController.listAuditLogs);
auditRouter.get("/:id", auditController.getAuditLogById);
