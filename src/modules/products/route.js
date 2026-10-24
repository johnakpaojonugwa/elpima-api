import { Router } from "express";
import * as productController from "./controller.js";
import {
  createProductSchema,
  updateProductSchema,
  toggleStockSchema,
  listProductsQuerySchema,
} from "./validation.js";
import { validate } from "../../middlewares/validate.js";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { ROLES } from "../../constants/roles.js";

export const productsRouter = Router();

// Public routes
productsRouter.get("/", validate(listProductsQuerySchema, "query"), productController.listProducts);
productsRouter.get("/id/:id", productController.getProductById);
productsRouter.get("/:slug/related", productController.getRelatedProducts);
productsRouter.get("/:slug", productController.getProductBySlug);

// Protected routes (Super-Admin & Supervising Manager)
productsRouter.post(
  "/",
  requireAuth,
  requireRole(ROLES.SUPER_ADMIN, ROLES.SUPERVISING_MANAGER),
  validate(createProductSchema),
  productController.createProduct
);

productsRouter.put(
  "/:id",
  requireAuth,
  requireRole(ROLES.SUPER_ADMIN, ROLES.SUPERVISING_MANAGER),
  validate(updateProductSchema),
  productController.updateProduct
);

productsRouter.patch(
  "/:id/stock",
  requireAuth,
  requireRole(ROLES.SUPER_ADMIN, ROLES.SUPERVISING_MANAGER),
  validate(toggleStockSchema),
  productController.toggleStock
);

productsRouter.delete(
  "/:id",
  requireAuth,
  requireRole(ROLES.SUPER_ADMIN),
  productController.deleteProduct
);
