import { Router } from "express";
import * as managerController from "./controller.js";
import {
  createManagerSchema,
  updateManagerSchema,
  updateManagerStatusSchema,
} from "./validation.js";
import { validate } from "../../middlewares/validate.js";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { ROLES } from "../../constants/roles.js";

export const managersRouter = Router();

// All manager management routes require SUPER_ADMIN
managersRouter.use(requireAuth, requireRole(ROLES.SUPER_ADMIN));

managersRouter.get("/", managerController.listManagers);
managersRouter.post("/", validate(createManagerSchema), managerController.createManager);
managersRouter.get("/:id", managerController.getManagerById);
managersRouter.put("/:id", validate(updateManagerSchema), managerController.updateManager);
managersRouter.patch("/:id/status", validate(updateManagerStatusSchema), managerController.updateManagerStatus);
managersRouter.delete("/:id", managerController.deleteManager);
