import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/AppError.js";

// Ensure local uploads directory exists
const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

let supabaseClient = null;
const supabaseKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
if (env.SUPABASE_URL && supabaseKey) {
  supabaseClient = createClient(env.SUPABASE_URL, supabaseKey);
}

/**
 * Upload an image buffer to Supabase Storage or local static storage fallback
 * @param {object} file - Multer file object
 * @returns {Promise<string>} Public URL of the uploaded image
 */
export async function uploadImage(file) {
  if (!file) {
    throw new AppError(400, "No image file provided", "bad_request");
  }

  // Generate unique filename with original extension
  const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
  const uniqueName = `surgical-${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;

  // If Supabase Storage is configured, upload to bucket
  if (supabaseClient) {
    const bucket = "products";
    const { data, error } = await supabaseClient.storage
      .from(bucket)
      .upload(uniqueName, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      throw new AppError(500, `Storage upload failed: ${error.message}`, "storage_error");
    }

    const { data: publicUrlData } = supabaseClient.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
  }

  // Local fallback: save to uploads folder
  const targetPath = path.join(UPLOADS_DIR, uniqueName);
  await fs.promises.writeFile(targetPath, file.buffer);

  // Return local asset URL
  return `/uploads/${uniqueName}`;
}
