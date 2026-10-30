import { z } from "zod";

export const listAuditLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  entityType: z.string().trim().max(50).optional(),
  action: z.string().trim().max(50).optional(),
});

