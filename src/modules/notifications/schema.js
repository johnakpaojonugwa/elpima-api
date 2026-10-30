import { z } from "zod";

export const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  category: z
    .enum(["general", "system", "GENERAL", "SYSTEM"])
    .transform((val) => val.toUpperCase())
    .optional(),
  isRead: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .optional(),
});

export const markNotificationReadParamsSchema = z.object({
  id: z.string().uuid("Invalid notification ID"),
});

export const markAllReadBodySchema = z.object({
  category: z
    .enum(["general", "system", "GENERAL", "SYSTEM"])
    .transform((val) => val.toUpperCase())
    .optional(),
});

export const createNotificationSchema = z.object({
  userId: z.string().uuid().optional(),
  category: z
    .enum(["general", "system", "GENERAL", "SYSTEM"])
    .transform((val) => val.toUpperCase())
    .default("GENERAL"),
  iconType: z
    .enum([
      "quote",
      "urgent",
      "product",
      "manager",
      "system-db",
      "system-shield",
      "QUOTE",
      "URGENT",
      "PRODUCT",
      "MANAGER",
      "SYSTEM_DB",
      "SYSTEM_SHIELD",
    ])
    .transform((val) => val.toUpperCase().replace("-", "_"))
    .default("QUOTE"),
  title: z.string().min(2).max(255),
  description: z.string().min(2).max(1000),
  metadata: z.record(z.any()).optional(),
});

