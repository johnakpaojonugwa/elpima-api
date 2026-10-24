import { Router } from "express";
import * as categoryController from "./controller.js";
import { createCategorySchema, updateCategorySchema } from "./validation.js";
import { validate } from "../../middlewares/validate.js";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { ROLES } from "../../constants/roles.js";

export const categoriesRouter = Router();

// Public endpoints
categoriesRouter.get("/", categoryController.listCategories);
categoriesRouter.get("/id/:id", categoryController.getCategoryById);
categoriesRouter.get("/:slug", categoryController.getCategoryBySlug);

// Protected staff/admin endpoints
categoriesRouter.post(
  "/",
  requireAuth,
  requireRole(ROLES.SUPER_ADMIN, ROLES.SUPERVISING_MANAGER),
  validate(createCategorySchema),
  categoryController.createCategory
);

categoriesRouter.put(
  "/:id",
  requireAuth,
  requireRole(ROLES.SUPER_ADMIN, ROLES.SUPERVISING_MANAGER),
  validate(updateCategorySchema),
  categoryController.updateCategory
);

categoriesRouter.delete(
  "/:id",
  requireAuth,
  requireRole(ROLES.SUPER_ADMIN),
  categoryController.deleteCategory
);
