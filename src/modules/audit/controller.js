import * as auditService from "./service.js";
import { paginatedResponse, successResponse } from "../../utils/response.js";

export async function listAuditLogs(req, res, next) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const { total, logs } = await auditService.listAuditLogs({
      page,
      limit,
      entityType: req.query.entityType,
      action: req.query.action,
    });

    return paginatedResponse(res, {
      data: logs,
      total,
      page,
      limit,
      message: "Audit logs retrieved successfully",
    });
  } catch (error) {
    next(error);
  }
}

export async function getAuditLogById(req, res, next) {
  try {
    const log = await auditService.getAuditLogById(req.params.id);
    return successResponse(res, {
      message: "Audit log retrieved successfully",
      data: log,
    });
  } catch (error) {
    next(error);
  }
}
