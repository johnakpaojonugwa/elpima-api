import * as auditService from "./service.js";
import { paginatedResponse, successResponse } from "../../utils/response.js";

export async function listAuditLogs(request, response, nextFunction) {
  try {
    const page = Number(request.query.page) || 1;
    const limit = Number(request.query.limit) || 50;
    const { total, logs } = await auditService.listAuditLogs({
      page,
      limit,
      entityType: request.query.entityType,
      action: request.query.action,
    });

    return paginatedResponse(response, {
      data: logs,
      total,
      page,
      limit,
      message: "Audit logs retrieved successfully",
    });
  } catch (error) {
    nextFunction(error);
  }
}

export async function getAuditLogById(request, response, nextFunction) {
  try {
    const log = await auditService.getAuditLogById(request.params.id);
    return successResponse(response, {
      message: "Audit log retrieved successfully",
      data: log,
    });
  } catch (error) {
    nextFunction(error);
  }
}
