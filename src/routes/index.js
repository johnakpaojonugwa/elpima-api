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
import { notificationsRouter } from "../modules/notifications/route.js";

import { env } from "../config/env.js";

export const router = Router();

// Root welcome & service directory endpoint
router.get("/", (request, response) => {
  response.json({
    success: true,
    data: {
      name: env.COMPANY_NAME || "Elpima Surgicals Limited API",
      version: "1.0.0",
      status: "operational",
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
      links: {
        documentation: "/api/v1/docs",
        health: "/health",
        api: "/api/v1",
      },
    },
    message: "Welcome to Elpima Surgicals API. Use /api/v1/docs for interactive OpenAPI documentation.",
  });
});

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
v1Router.use("/notifications", notificationsRouter);

router.use("/api/v1", v1Router);
