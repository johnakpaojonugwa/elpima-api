import { Router } from "express";
import multer from "multer";
import * as uploadController from "./controller.js";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { AppError } from "../../utils/AppError.js";
import { ROLES } from "../../constants/roles.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // Max 5MB per image
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ["image/jpeg", "image/png", "image/webp"];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new AppError(
          400,
          "Invalid file type. Only JPEG, PNG, and WebP surgical equipment images are allowed.",
          "invalid_file_type"
        )
      );
    }
  },
});

export const uploadRouter = Router();

// Protected: Super-Admin & Supervising Manager can upload images
uploadRouter.use(requireAuth, requireRole(ROLES.SUPER_ADMIN, ROLES.SUPERVISING_MANAGER));

uploadRouter.post("/image", upload.single("image"), uploadController.uploadSingleImage);
uploadRouter.post("/images", upload.array("images", 10), uploadController.uploadMultipleImages);
