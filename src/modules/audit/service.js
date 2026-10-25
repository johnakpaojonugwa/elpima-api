import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";

export async function listAuditLogs({ page = 1, limit = 50, entityType, action }) {
  const skip = (page - 1) * limit;

  const where = {};
  if (entityType) where.entityType = entityType;
  if (action) where.action = action;

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        actor: {
          select: { id: true, fullName: true, email: true, role: true },
        },
      },
    }),
  ]);

  return { total, page, limit, logs };
}

export async function getAuditLogById(auditLogId) {
  const log = await prisma.auditLog.findUnique({
    where: { id: auditLogId },
    include: {
      actor: {
        select: { id: true, fullName: true, email: true, role: true },
      },
    },
  });

  if (!log) {
    throw new AppError(404, "Audit log record not found", "audit_log_not_found");
  }

  return log;
}
