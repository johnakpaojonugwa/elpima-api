import * as uploadService from "./service.js";
import { successResponse } from "../../utils/response.js";
import { AppError } from "../../utils/AppError.js";

export async function uploadSingleImage(request, response, nextFunction) {
  try {
    if (!request.file) {
      throw new AppError(400, "Please provide an image file under the 'image' field", "bad_request");
    }

    const url = await uploadService.uploadImage(request.file);

    return successResponse(response, {
      statusCode: 201,
      message: "Image uploaded successfully",
      data: {
        url,
        fileName: request.file.originalname,
        size: request.file.size,
        mimeType: request.file.mimetype,
      },
    });
  } catch (error) {
    nextFunction(error);
  }
}

export async function uploadMultipleImages(request, response, nextFunction) {
  try {
    if (!request.files || !request.files.length) {
      throw new AppError(400, "Please provide image files under the 'images' field", "bad_request");
    }

    const urls = await Promise.all(
      request.files.map((file) => uploadService.uploadImage(file))
    );

    return successResponse(response, {
      statusCode: 201,
      message: `${urls.length} images uploaded successfully`,
      data: { urls },
    });
  } catch (error) {
    nextFunction(error);
  }
}
