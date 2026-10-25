import * as authService from "./service.js";
import { successResponse } from "../../utils/response.js";

export async function login(request, response, nextFunction) {
  try {
    const clientInfo = {
      ip: request.ip,
      userAgent: request.headers["user-agent"],
    };
    const result = await authService.login(request.body, clientInfo);
    return successResponse(response, {
      statusCode: 200,
      message: "Authentication successful",
      data: result,
    });
  } catch (error) {
    nextFunction(error);
  }
}

export async function getProfile(request, response, nextFunction) {
  try {
    const profile = await authService.getProfile(request.user.id);
    return successResponse(response, {
      statusCode: 200,
      message: "Profile retrieved successfully",
      data: profile,
    });
  } catch (error) {
    nextFunction(error);
  }
}

export async function changePassword(request, response, nextFunction) {
  try {
    const clientInfo = {
      ip: request.ip,
      userAgent: request.headers["user-agent"],
    };
    const result = await authService.changePassword(request.user.id, request.body, clientInfo);
    return successResponse(response, {
      statusCode: 200,
      message: result.message,
    });
  } catch (error) {
    nextFunction(error);
  }
}

export async function logout(request, response, nextFunction) {
  try {
    const clientInfo = {
      ip: request.ip,
      userAgent: request.headers["user-agent"],
    };
    const result = await authService.logout(request.user, clientInfo);
    return successResponse(response, {
      statusCode: 200,
      message: result.message,
    });
  } catch (error) {
    nextFunction(error);
  }
}

export async function updateProfile(request, response, nextFunction) {
  try {
    const clientInfo = {
      ip: request.ip,
      userAgent: request.headers["user-agent"],
    };
    const updated = await authService.updateProfile(request.user.id, request.body, clientInfo);
    return successResponse(response, {
      statusCode: 200,
      message: "Profile updated successfully",
      data: updated,
    });
  } catch (error) {
    nextFunction(error);
  }
}
