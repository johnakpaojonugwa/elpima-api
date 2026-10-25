import * as managerService from "./service.js";
import { successResponse } from "../../utils/response.js";

export async function listManagers(_request, response, nextFunction) {
  try {
    const managers = await managerService.listManagers();
    return successResponse(response, {
      message: "Managers retrieved successfully",
      data: managers,
    });
  } catch (error) {
    nextFunction(error);
  }
}

export async function createManager(request, response, nextFunction) {
  try {
    const manager = await managerService.createManager(request.body, request.user);
    return successResponse(response, {
      statusCode: 201,
      message: "Supervising Manager created successfully",
      data: manager,
    });
  } catch (error) {
    nextFunction(error);
  }
}

export async function updateManagerStatus(request, response, nextFunction) {
  try {
    const updated = await managerService.updateManagerStatus(request.params.id, request.body, request.user);
    return successResponse(response, {
      message: `Manager ${updated.isActive ? "activated" : "deactivated"} successfully`,
      data: updated,
    });
  } catch (error) {
    nextFunction(error);
  }
}

export async function getManagerById(request, response, nextFunction) {
  try {
    const manager = await managerService.getManagerById(request.params.id);
    return successResponse(response, {
      message: "Manager details retrieved successfully",
      data: manager,
    });
  } catch (error) {
    nextFunction(error);
  }
}

export async function updateManager(request, response, nextFunction) {
  try {
    const clientInfo = { ip: request.ip, userAgent: request.headers["user-agent"] };
    const updated = await managerService.updateManager(request.params.id, request.body, request.user, clientInfo);
    return successResponse(response, {
      message: "Manager profile updated successfully",
      data: updated,
    });
  } catch (error) {
    nextFunction(error);
  }
}

export async function deleteManager(request, response, nextFunction) {
  try {
    const clientInfo = { ip: request.ip, userAgent: request.headers["user-agent"] };
    const result = await managerService.deleteManager(request.params.id, request.user, clientInfo);
    return successResponse(response, {
      message: result.message,
    });
  } catch (error) {
    nextFunction(error);
  }
}
