import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("A valid email address is required").trim().toLowerCase(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  twoFactorCode: z.string().trim().optional(),
});

export const verify2FASchema = z.object({
  tempToken: z.string().min(1, "Temporary 2FA challenge token is required"),
  code: z.string().min(6, "2FA code or backup code is required").trim(),
});

export const enable2FASchema = z.object({
  code: z.string().length(6, "A 6-digit TOTP code is required").trim(),
});

export const disable2FASchema = z.object({
  password: z.string().min(1, "Current password is required"),
  code: z.string().min(6, "2FA code or backup code is required").trim(),
});

export const regenerateBackupCodesSchema = z.object({
  password: z.string().min(1, "Current password is required"),
  code: z.string().min(6, "2FA code is required").trim(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters long"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("A valid email address is required").trim().toLowerCase(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required").trim(),
  newPassword: z.string().min(8, "Password must be at least 8 characters long"),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required").trim(),
});

export const updateProfileSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(100).trim().optional(),
  phone: z.string().max(25).trim().optional().nullable(),
});


