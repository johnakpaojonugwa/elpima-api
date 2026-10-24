import * as analyticsService from "./service.js";
import { successResponse } from "../../utils/response.js";

export async function getDashboardStats(_req, res, next) {
  try {
    const stats = await analyticsService.getDashboardStats();
    return successResponse(res, {
      message: "Dashboard analytics retrieved successfully",
      data: stats,
    });
  } catch (error) {
    next(error);
  }
}
