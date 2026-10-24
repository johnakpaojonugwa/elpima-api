import { Router } from "express";
import { healthRouter } from "./health.route.js";
import { authRouter } from "../modules/auth/route.js";
import { categoriesRouter } from "../modules/categories/route.js";
import { specialtiesRouter } from "../modules/specialties/route.js";
import { productsRouter } from "../modules/products/route.js";
import { quotesRouter } from "../modules/quotes/route.js";
import { managersRouter } from "../modules/managers/route.js";
import { auditRouter } from "../modules/audit/route.js";
import { settingsRouter } from "../modules/settings/route.js";
import { uploadRouter } from "../modules/upload/route.js";
import { analyticsRouter } from "../modules/analytics/route.js";

export const router = Router();

// Unversioned system health check
router.use("/health", healthRouter);

// Versioned API v1 Router
const v1Router = Router();

v1Router.use("/auth", authRouter);
v1Router.use("/categories", categoriesRouter);
v1Router.use("/specialties", specialtiesRouter);
v1Router.use("/products", productsRouter);
v1Router.use("/quotes", quotesRouter);
v1Router.use("/managers", managersRouter);
v1Router.use("/audit-logs", auditRouter);
v1Router.use("/settings", settingsRouter);
v1Router.use("/upload", uploadRouter);
v1Router.use("/analytics", analyticsRouter);

router.use("/api/v1", v1Router);
