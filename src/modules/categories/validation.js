import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters").max(100, "Category name cannot exceed 100 characters").trim(),
  slug: z.string().min(2).max(120).trim().toLowerCase().regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase alphanumeric characters and hyphens").optional(),
  description: z.string().max(1000, "Description cannot exceed 1000 characters").optional(),
  imageUrl: z.string().url("Must be a valid URL").max(1000).optional().nullable(),
  icon: z.string().max(50).optional().nullable(),
  displayOrder: z.coerce.number().int().min(0).max(1000).default(0),
  isActive: z.boolean().default(true),
});

export const updateCategorySchema = createCategorySchema.partial();
