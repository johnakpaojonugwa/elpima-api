import * as managerService from "./service.js";
import { successResponse } from "../../utils/response.js";

export async function listManagers(_req, res, next) {
  try {
    const managers = await managerService.listManagers();
    return successResponse(res, {
      message: "Managers retrieved successfully",
      data: managers,
    });
  } catch (error) {
    next(error);
  }
}

export async function createManager(req, res, next) {
  try {
    const manager = await managerService.createManager(req.body, req.user);
    return successResponse(res, {
      statusCode: 201,
      message: "Supervising Manager created successfully",
      data: manager,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateManagerStatus(req, res, next) {
  try {
    const updated = await managerService.updateManagerStatus(req.params.id, req.body, req.user);
    return successResponse(res, {
      message: `Manager ${updated.isActive ? "activated" : "deactivated"} successfully`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

export async function getManagerById(req, res, next) {
  try {
    const manager = await managerService.getManagerById(req.params.id);
    return successResponse(res, {
      message: "Manager details retrieved successfully",
      data: manager,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateManager(req, res, next) {
  try {
    const clientInfo = { ip: req.ip, userAgent: req.headers["user-agent"] };
    const updated = await managerService.updateManager(req.params.id, req.body, req.user, clientInfo);
    return successResponse(res, {
      message: "Manager profile updated successfully",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteManager(req, res, next) {
  try {
    const clientInfo = { ip: req.ip, userAgent: req.headers["user-agent"] };
    const result = await managerService.deleteManager(req.params.id, req.user, clientInfo);
    return successResponse(res, {
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
}
