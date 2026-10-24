import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(2, "Product name is required").max(200, "Name cannot exceed 200 characters").trim(),
  slug: z.string().trim().toLowerCase().max(250).regex(/^[a-z0-9-]+$/).optional(),
  sku: z.string().trim().max(50, "SKU cannot exceed 50 characters").optional().nullable(),
  categoryId: z.string().uuid("Invalid category ID"),
  specialtyId: z.string().uuid("Invalid specialty ID").optional().nullable(),
  shortDescription: z.string().max(500, "Short description cannot exceed 500 characters").optional().nullable(),
  description: z.string().max(10000, "Description cannot exceed 10000 characters").optional().nullable(),
  specifications: z.record(z.any()).optional().nullable(),
  compliance: z.array(z.string().max(50)).max(20).default([]),
  images: z.array(z.string().url("Image must be a valid URL").max(1000)).min(1, "At least one product image is required").max(10, "Maximum 10 images allowed"),
  inStock: z.boolean().default(true),
  leadTime: z.string().max(100, "Lead time cannot exceed 100 characters").optional().nullable(),
  minOrderQuantity: z.coerce.number().int().min(1).max(10000).default(1),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const updateProductSchema = createProductSchema.partial();

export const toggleStockSchema = z.object({
  inStock: z.boolean(),
  leadTime: z.string().max(100).optional().nullable(),
});

export const listProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100, "Search term cannot exceed 100 characters").optional(),
  category: z.string().trim().max(100).optional(),
  specialty: z.string().trim().max(100).optional(),
  inStock: z.enum(["true", "false"]).optional(),
  featured: z.enum(["true", "false"]).optional(),
  sort: z.enum(["newest", "oldest", "name_asc", "name_desc", "popular"]).default("newest"),
});
