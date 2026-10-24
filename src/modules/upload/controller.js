import * as uploadService from "./service.js";
import { successResponse } from "../../utils/response.js";
import { AppError } from "../../utils/AppError.js";

export async function uploadSingleImage(req, res, next) {
  try {
    if (!req.file) {
      throw new AppError(400, "Please provide an image file under the 'image' field", "bad_request");
    }

    const url = await uploadService.uploadImage(req.file);

    return successResponse(res, {
      statusCode: 201,
      message: "Image uploaded successfully",
      data: {
        url,
        fileName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function uploadMultipleImages(req, res, next) {
  try {
    if (!req.files || !req.files.length) {
      throw new AppError(400, "Please provide image files under the 'images' field", "bad_request");
    }

    const urls = await Promise.all(
      req.files.map((file) => uploadService.uploadImage(file))
    );

    return successResponse(res, {
      statusCode: 201,
      message: `${urls.length} images uploaded successfully`,
      data: { urls },
    });
  } catch (error) {
    next(error);
  }
}
