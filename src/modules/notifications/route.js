import { Router } from "express";
import * as notificationController from "./controller.js";
import {
  listNotificationsQuerySchema,
  markNotificationReadParamsSchema,
  markAllReadBodySchema,
} from "./schema.js";
import { validate } from "../../middlewares/validate.js";
import { requireAuth } from "../../middlewares/auth.js";

export const notificationsRouter = Router();

// All notification routes require an authenticated user (Super Admin or Supervising Manager)
notificationsRouter.use(requireAuth);

/**
 * GET /api/v1/notifications/stream
 * Server-Sent Events (SSE) live push connection
 * Accepts Bearer token in header or ?token= query parameter
 */
notificationsRouter.get("/stream", notificationController.streamNotifications);

/**
 * GET /api/v1/notifications/unread-count
 * Fast unread counter for navigation bell badge
 */
notificationsRouter.get("/unread-count", notificationController.getUnreadCount);

/**
 * GET /api/v1/notifications
 * Paginated list with category and read status filtering
 */
notificationsRouter.get(
  "/",
  validate(listNotificationsQuerySchema, "query"),
  notificationController.listNotifications
);

/**
 * PATCH /api/v1/notifications/:id/read
 * Mark a single notification as read/unread
 */
notificationsRouter.patch(
  "/:id/read",
  validate(markNotificationReadParamsSchema, "params"),
  notificationController.markNotificationRead
);

/**
 * POST /api/v1/notifications/mark-all-read
 * Mark all notifications as read
 */
notificationsRouter.post(
  "/mark-all-read",
  validate(markAllReadBodySchema, "body"),
  notificationController.markAllNotificationsRead
);

