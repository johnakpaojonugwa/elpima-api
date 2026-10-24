import * as settingsService from "./service.js";
import { successResponse } from "../../utils/response.js";

export async function getSettings(_req, res, next) {
  try {
    const settings = await settingsService.getSettings();
    return successResponse(res, {
      message: "Store settings retrieved successfully",
      data: settings,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateSettings(req, res, next) {
  try {
    const updated = await settingsService.updateSettings(req.body, req.user);
    return successResponse(res, {
      message: "Store settings updated successfully",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}
