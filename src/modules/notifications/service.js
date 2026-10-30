import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { broadcastNotification } from "./sse.js";

/**
 * Format timestamp and day relative to now for the frontend UI
 */
export function formatNotificationForUi(item) {
  const createdDate = new Date(item.createdAt);
  const now = new Date();

  // Determine calendar day
  const isToday =
    createdDate.getDate() === now.getDate() &&
    createdDate.getMonth() === now.getMonth() &&
    createdDate.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    createdDate.getDate() === yesterday.getDate() &&
    createdDate.getMonth() === yesterday.getMonth() &&
    createdDate.getFullYear() === yesterday.getFullYear();

  let day = "Today";
  if (isYesterday) {
    day = "Yesterday";
  } else if (!isToday) {
    day = createdDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  // Format relative timestamp
  const diffMs = now.getTime() - createdDate.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);

  let timestamp = "Just Now";
  if (diffMinutes < 1) {
    timestamp = "Just Now";
  } else if (diffMinutes < 60) {
    timestamp = `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  } else if (diffHours < 24 && isToday) {
    timestamp = `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  } else if (isYesterday) {
    timestamp = "Yesterday";
  } else {
    timestamp = createdDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // Map enum to UI icon type e.g. SYSTEM_DB -> "system-db"
  const iconTypeMap = {
    QUOTE: "quote",
    URGENT: "urgent",
    PRODUCT: "product",
    MANAGER: "manager",
    SYSTEM_DB: "system-db",
    SYSTEM_SHIELD: "system-shield",
  };

  return {
    id: item.id,
    category: item.category.toLowerCase(), // "general" | "system"
    day,
    title: item.title,
    description: item.description,
    timestamp,
    isRead: item.isRead,
    iconType: iconTypeMap[item.iconType] || "quote",
    metadata: item.metadata || null,
    createdAt: item.createdAt,
  };
}

/**
 * Create a new notification, persist it to Postgres, and broadcast via Redis/SSE
 */
export async function createNotification(input) {
  const category = input.category ? input.category.toUpperCase() : "GENERAL";
  const iconType = input.iconType ? input.iconType.toUpperCase().replace("-", "_") : "QUOTE";

  const record = await prisma.notification.create({
    data: {
      userId: input.userId || null,
      category,
      iconType,
      title: input.title,
      description: input.description,
      metadata: input.metadata || null,
    },
  });

  const formatted = formatNotificationForUi(record);

  // Broadcast to all active SSE subscribers via Redis Pub/Sub + SSE
  await broadcastNotification(formatted);

  return formatted;
}

/**
 * List notifications with filtering and pagination
 */
export async function listNotifications({ user, page = 1, limit = 20, category, isRead }) {
  const skip = (page - 1) * limit;

  const where = {
    OR: [{ userId: user.id }, { userId: null }],
  };

  if (category) {
    where.category = category.toUpperCase();
  }

  if (typeof isRead === "boolean") {
    where.isRead = isRead;
  }

  const [total, items, unreadCount] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ createdAt: "desc" }],
    }),
    prisma.notification.count({
      where: {
        OR: [{ userId: user.id }, { userId: null }],
        isRead: false,
      },
    }),
  ]);

  const formattedItems = items.map(formatNotificationForUi);

  return {
    total,
    page,
    limit,
    unreadCount,
    notifications: formattedItems,
  };
}

/**
 * Get count of unread notifications for badge
 */
export async function getUnreadCount(user) {
  const count = await prisma.notification.count({
    where: {
      OR: [{ userId: user.id }, { userId: null }],
      isRead: false,
    },
  });
  return count;
}

/**
 * Mark a single notification as read/unread
 */
export async function markNotificationAsRead(id, user, isRead = true) {
  const existing = await prisma.notification.findFirst({
    where: {
      id,
      OR: [{ userId: user.id }, { userId: null }],
    },
  });

  if (!existing) {
    throw new AppError(404, "Notification not found", "notification_not_found");
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: { isRead },
  });

  return formatNotificationForUi(updated);
}

/**
 * Mark all notifications as read for current user
 */
export async function markAllNotificationsAsRead(user, { category } = {}) {
  const where = {
    OR: [{ userId: user.id }, { userId: null }],
    isRead: false,
  };

  if (category) {
    where.category = category.toUpperCase();
  }

  const result = await prisma.notification.updateMany({
    where,
    data: { isRead: true },
  });

  return { updatedCount: result.count };
}

