import { z } from "zod";

export const createManagerSchema = z.object({
  fullName: z.string().min(2, "Full name is required").trim(),
  email: z.string().email("A valid email address is required").trim().toLowerCase(),
  phone: z.string().trim().optional(),
  password: z.string().min(8, "Temporary password must be at least 8 characters long"),
});

export const updateManagerStatusSchema = z.object({
  isActive: z.boolean(),
});

export const updateManagerSchema = z.object({
  fullName: z.string().min(2, "Full name is required").trim().optional(),
  email: z.string().email("A valid email address is required").trim().toLowerCase().optional(),
  phone: z.string().trim().optional(),
  password: z.string().min(8, "Temporary password must be at least 8 characters long").optional(),
});
