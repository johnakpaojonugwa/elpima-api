import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("A valid email address is required").trim().toLowerCase(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters long"),
});

export const updateProfileSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(100).trim().optional(),
  phone: z.string().max(25).trim().optional().nullable(),
});
