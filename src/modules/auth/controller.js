import * as authService from "./service.js";
import { successResponse } from "../../utils/response.js";

export async function login(req, res, next) {
  try {
    const clientInfo = {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    };
    const result = await authService.login(req.body, clientInfo);
    return successResponse(res, {
      statusCode: 200,
      message: "Authentication successful",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getProfile(req, res, next) {
  try {
    const profile = await authService.getProfile(req.user.id);
    return successResponse(res, {
      statusCode: 200,
      message: "Profile retrieved successfully",
      data: profile,
    });
  } catch (error) {
    next(error);
  }
}

export async function changePassword(req, res, next) {
  try {
    const clientInfo = {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    };
    const result = await authService.changePassword(req.user.id, req.body, clientInfo);
    return successResponse(res, {
      statusCode: 200,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(req, res, next) {
  try {
    const clientInfo = {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    };
    const result = await authService.logout(req.user, clientInfo);
    return successResponse(res, {
      statusCode: 200,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const clientInfo = {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    };
    const updated = await authService.updateProfile(req.user.id, req.body, clientInfo);
    return successResponse(res, {
      statusCode: 200,
      message: "Profile updated successfully",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}
