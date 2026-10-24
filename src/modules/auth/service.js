import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../config/prisma.js";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/AppError.js";

// Constant-time dummy hash to prevent user enumeration via timing attacks
const DUMMY_BCRYPT_HASH = "$2a$12$e80yG2wGz7P.N3s8M8p1.eJ3V2Lw0TqC1UjL4Qc2D0V3W4X5Y6Z7.";

/**
 * Generate signed JWT token explicitly using HS256
 */
export function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    },
    env.JWT_SECRET,
    {
      algorithm: "HS256",
      expiresIn: env.JWT_EXPIRES_IN,
    }
  );
}

/**
 * Authenticate user (Super-Admin or Supervising Manager)
 * Uses constant-time bcrypt verification to defeat email enumeration timing side-channels
 */
export async function login({ email, password }, clientInfo = {}) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  // Always run bcrypt comparison, even if user doesn't exist, to equalize response latency
  const hashToVerify = user ? user.passwordHash : DUMMY_BCRYPT_HASH;
  const isValidPassword = await bcrypt.compare(password, hashToVerify);

  if (!user || !user.isActive || !isValidPassword) {
    throw new AppError(401, "Invalid email or password", "invalid_credentials");
  }

  // Update last login timestamp asynchronously
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  // Write audit log with client network context
  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      actorRole: user.role,
      action: "LOGIN",
      entityType: "user",
      entityId: user.id,
      ipAddress: clientInfo.ip || null,
      userAgent: clientInfo.userAgent || null,
    },
  });

  const token = signToken(user);

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      phone: user.phone,
      lastLoginAt: user.lastLoginAt,
    },
  };
}

/**
 * Get current profile by user ID
 */
export async function getProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      phone: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  if (!user || !user.isActive) {
    throw new AppError(404, "User account not found or deactivated", "user_not_found");
  }

  return user;
}

/**
 * Change user password
 */
export async function changePassword(userId, { currentPassword, newPassword }, clientInfo = {}) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError(404, "User not found", "user_not_found");
  }

  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) {
    throw new AppError(400, "Current password is incorrect", "bad_request");
  }

  const newHash = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newHash },
  });

  // Write audit log
  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      actorRole: user.role,
      action: "CHANGE_PASSWORD",
      entityType: "user",
      entityId: user.id,
      ipAddress: clientInfo.ip || null,
      userAgent: clientInfo.userAgent || null,
    },
  });

  return { message: "Password updated successfully" };
}

/**
 * Logout authenticated user (records audit log)
 */
export async function logout(user, clientInfo = {}) {
  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      actorRole: user.role,
      action: "LOGOUT",
      entityType: "user",
      entityId: user.id,
      ipAddress: clientInfo.ip || null,
      userAgent: clientInfo.userAgent || null,
    },
  });

  return { message: "Logged out successfully" };
}

/**
 * Update current user's profile details
 */
export async function updateProfile(userId, { fullName, phone }, clientInfo = {}) {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(fullName ? { fullName } : {}),
      ...(phone !== undefined ? { phone } : {}),
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      phone: true,
      isActive: true,
      lastLoginAt: true,
      updatedAt: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: updated.id,
      actorRole: updated.role,
      action: "UPDATE_PROFILE",
      entityType: "user",
      entityId: updated.id,
      metadata: { fullName, phone },
      ipAddress: clientInfo.ip || null,
      userAgent: clientInfo.userAgent || null,
    },
  });

  return updated;
}
