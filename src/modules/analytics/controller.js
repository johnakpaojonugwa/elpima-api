import * as analyticsService from "./service.js";
import { successResponse } from "../../utils/response.js";

export async function getDashboardStats(_request, response, nextFunction) {
  try {
    const stats = await analyticsService.getDashboardStats();
    return successResponse(response, {
      message: "Dashboard analytics retrieved successfully",
      data: stats,
    });
  } catch (error) {
    nextFunction(error);
  }
}
