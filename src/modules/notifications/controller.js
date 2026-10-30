import * as notificationService from "./service.js";
import { handleSSEConnection } from "./sse.js";
import { successResponse, paginatedResponse } from "../../utils/response.js";

/**
 * GET /api/v1/notifications
 * List notifications with filtering and pagination
 */
export async function listNotifications(request, response, nextFunction) {
  try {
    const { page, limit, category, isRead } = request.query;
    const result = await notificationService.listNotifications({
      user: request.user,
      page,
      limit,
      category,
      isRead,
    });

    return paginatedResponse(response, {
      data: {
        notifications: result.notifications,
        unreadCount: result.unreadCount,
      },
      total: result.total,
      page: result.page,
      limit: result.limit,
      message: "Notifications retrieved successfully",
    });
  } catch (error) {
    nextFunction(error);
  }
}

/**
 * GET /api/v1/notifications/unread-count
 * Fast unread counter for navigation bell badge
 */
export async function getUnreadCount(request, response, nextFunction) {
  try {
    const count = await notificationService.getUnreadCount(request.user);
    return successResponse(response, {
      message: "Unread notifications count retrieved",
      data: { unreadCount: count },
    });
  } catch (error) {
    nextFunction(error);
  }
}

/**
 * PATCH /api/v1/notifications/:id/read
 * Mark a single notification as read/unread
 */
export async function markNotificationRead(request, response, nextFunction) {
  try {
    const isRead = request.body?.isRead !== undefined ? Boolean(request.body.isRead) : true;
    const notification = await notificationService.markNotificationAsRead(
      request.params.id,
      request.user,
      isRead
    );

    return successResponse(response, {
      message: `Notification marked as ${isRead ? "read" : "unread"}`,
      data: notification,
    });
  } catch (error) {
    nextFunction(error);
  }
}

/**
 * POST /api/v1/notifications/mark-all-read
 * Mark all notifications as read
 */
export async function markAllNotificationsRead(request, response, nextFunction) {
  try {
    const result = await notificationService.markAllNotificationsAsRead(
      request.user,
      request.body
    );

    return successResponse(response, {
      message: "All notifications marked as read",
      data: result,
    });
  } catch (error) {
    nextFunction(error);
  }
}

/**
 * GET /api/v1/notifications/stream
 * Server-Sent Events (SSE) live push stream for authenticated admins
 */
export async function streamNotifications(request, response, nextFunction) {
  try {
    return handleSSEConnection(request, response);
  } catch (error) {
    nextFunction(error);
  }
}

