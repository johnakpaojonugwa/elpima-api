import { Router } from "express";
import * as specialtyController from "./controller.js";
import { createSpecialtySchema, updateSpecialtySchema } from "./validation.js";
import { validate } from "../../middlewares/validate.js";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { ROLES } from "../../constants/roles.js";

export const specialtiesRouter = Router();

// Public endpoints
specialtiesRouter.get("/", specialtyController.listSpecialties);
specialtiesRouter.get("/id/:id", specialtyController.getSpecialtyById);
specialtiesRouter.get("/:slug", specialtyController.getSpecialtyBySlug);

// Protected staff/admin endpoints
specialtiesRouter.post(
  "/",
  requireAuth,
  requireRole(ROLES.SUPER_ADMIN, ROLES.SUPERVISING_MANAGER),
  validate(createSpecialtySchema),
  specialtyController.createSpecialty
);

specialtiesRouter.put(
  "/:id",
  requireAuth,
  requireRole(ROLES.SUPER_ADMIN, ROLES.SUPERVISING_MANAGER),
  validate(updateSpecialtySchema),
  specialtyController.updateSpecialty
);

specialtiesRouter.delete(
  "/:id",
  requireAuth,
  requireRole(ROLES.SUPER_ADMIN),
  specialtyController.deleteSpecialty
);
