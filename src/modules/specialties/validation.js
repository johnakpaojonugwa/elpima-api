import { z } from "zod";

const imageUriSchema = z
  .string()
  .trim()
  .refine(
    (val) => val === "" || val.startsWith("/uploads/") || /^https?:\/\//i.test(val),
    { message: "Image must be a valid URL or local /uploads/ asset path" }
  );

export const createSpecialtySchema = z.object({
  name: z.string().min(2, "Specialty name is required").trim(),
  slug: z.string().min(2).trim().optional(),
  description: z.string().trim().optional(),
  imageUrl: imageUriSchema.optional(),
});

export const updateSpecialtySchema = z.object({
  name: z.string().min(2).trim().optional(),
  slug: z.string().min(2).trim().optional(),
  description: z.string().trim().optional(),
  imageUrl: imageUriSchema.optional(),
});
