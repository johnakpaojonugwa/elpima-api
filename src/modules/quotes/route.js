import { Router } from "express";
import * as quoteController from "./controller.js";
import {
  submitQuoteSchema,
  updateQuoteStatusSchema,
  assignQuoteSchema,
  listQuotesQuerySchema,
} from "./validation.js";
import { validate } from "../../middlewares/validate.js";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { quoteRateLimiter, pdfRateLimiter } from "../../middlewares/rateLimiter.js";
import { idempotency } from "../../middlewares/idempotency.js";
import { ROLES } from "../../constants/roles.js";

export const quotesRouter = Router();

// Public quote submission: Rate-limited, validated, and protected with idempotency
quotesRouter.post(
  "/",
  quoteRateLimiter,
  idempotency,
  validate(submitQuoteSchema),
  quoteController.createQuote
);

// Protected routes (Super-Admin & Supervising Manager)
quotesRouter.get(
  "/stats/overview",
  requireAuth,
  requireRole(ROLES.SUPER_ADMIN, ROLES.SUPERVISING_MANAGER),
  quoteController.getQuoteStats
);

quotesRouter.get(
  "/",
  requireAuth,
  requireRole(ROLES.SUPER_ADMIN, ROLES.SUPERVISING_MANAGER),
  validate(listQuotesQuerySchema, "query"),
  quoteController.listQuotes
);

quotesRouter.get(
  "/:reference/pdf",
  pdfRateLimiter,
  quoteController.downloadQuotePdf
);

quotesRouter.get(
  "/:reference",
  requireAuth,
  requireRole(ROLES.SUPER_ADMIN, ROLES.SUPERVISING_MANAGER),
  quoteController.getQuoteByReference
);

quotesRouter.patch(
  "/:id/status",
  requireAuth,
  requireRole(ROLES.SUPER_ADMIN, ROLES.SUPERVISING_MANAGER),
  validate(updateQuoteStatusSchema),
  quoteController.updateQuoteStatus
);

// Super-Admin only: Assign quote to a Supervising Manager
quotesRouter.patch(
  "/:id/assign",
  requireAuth,
  requireRole(ROLES.SUPER_ADMIN),
  validate(assignQuoteSchema),
  quoteController.assignQuote
);

// Super-Admin only: Delete quote inquiry
quotesRouter.delete(
  "/:id",
  requireAuth,
  requireRole(ROLES.SUPER_ADMIN),
  quoteController.deleteQuote
);
