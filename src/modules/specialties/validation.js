import { z } from "zod";

export const createSpecialtySchema = z.object({
  name: z.string().min(2, "Specialty name is required").trim(),
  slug: z.string().min(2).trim().optional(),
  description: z.string().trim().optional(),
  imageUrl: z.string().url("Image URL must be valid").optional().or(z.literal("")),
});

export const updateSpecialtySchema = z.object({
  name: z.string().min(2).trim().optional(),
  slug: z.string().min(2).trim().optional(),
  description: z.string().trim().optional(),
  imageUrl: z.string().url("Image URL must be valid").optional().or(z.literal("")),
});
