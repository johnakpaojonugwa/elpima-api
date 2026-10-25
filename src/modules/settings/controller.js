import * as settingsService from "./service.js";
import { successResponse } from "../../utils/response.js";

export async function getSettings(_request, response, nextFunction) {
  try {
    const settings = await settingsService.getSettings();
    return successResponse(response, {
      message: "Store settings retrieved successfully",
      data: settings,
    });
  } catch (error) {
    nextFunction(error);
  }
}

export async function updateSettings(request, response, nextFunction) {
  try {
    const updated = await settingsService.updateSettings(request.body, request.user);
    return successResponse(response, {
      message: "Store settings updated successfully",
      data: updated,
    });
  } catch (error) {
    nextFunction(error);
  }
}
