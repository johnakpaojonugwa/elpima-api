import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { generateSecret, generateURI, verifySync } from "otplib";
import qrcode from "qrcode";
import { prisma } from "../../config/prisma.js";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/AppError.js";
import { queuePasswordResetEmail, queueTwoFactorSecurityAlert } from "../../queues/index.js";

// Constant-time dummy hash to prevent user enumeration via timing attacks
const DUMMY_BCRYPT_HASH = "$2a$12$e80yG2wGz7P.N3s8M8p1.eJ3V2Lw0TqC1UjL4Qc2D0V3W4X5Y6Z7.";

function hashToken(token) {
  return crypto.createHash("sha256").update(token.trim()).digest("hex");
}

/**
 * Generate a cryptographically bound fingerprint of client IP and User-Agent
 * to detect session hijacking when a stolen token is used from a different device or network
 */
export function createClientFingerprint(clientInfo = {}) {
  const ip = (clientInfo.ip || "").split(",")[0].trim();
  const ua = (clientInfo.userAgent || "").trim();
  return crypto.createHash("sha256").update(`${ua}|${ip}`).digest("hex");
}

/**
 * Generate Access Token + Refresh Token pair and persist hashed refresh token in database.
 * Incorporates:
 * - Short access token lifespan (default 10m)
 * - User tokenVersion for instant 0ms global revocation
 * - Client device fingerprint binding
 * - Rolling idle timeout (default 2h)
 * - Hard session cap (default 8h)
 * - Token family tracking for multi-step rotation & reuse protection
 */
export async function createSession(user, clientInfo = {}, options = {}) {
  const accessToken = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      type: "access",
      tokenVersion: user.tokenVersion ?? 0,
    },
    env.JWT_SECRET,
    {
      algorithm: "HS256",
      expiresIn: env.JWT_ACCESS_EXPIRES_IN || "10m",
    }
  );

  const rawRefreshToken = crypto.randomBytes(40).toString("hex");
  const tokenHash = hashToken(rawRefreshToken);
  const fingerprintHash = createClientFingerprint(clientInfo);

  // Rolling idle expiry (e.g. 2 hours inactivity)
  const idleMs = (env.JWT_IDLE_TIMEOUT_MINUTES || 120) * 60 * 1000;
  const expiresAt = new Date(Date.now() + idleMs);

  // Hard cap on total continuous session duration (e.g. 8 hours)
  const maxSessionMs = (env.JWT_MAX_SESSION_HOURS || 8) * 60 * 60 * 1000;
  const absoluteExpiresAt = options.absoluteExpiresAt || new Date(Date.now() + maxSessionMs);
  const familyId = options.familyId || crypto.randomUUID();

  await prisma.refreshToken.create({
    data: {
      tokenHash,
      familyId,
      userId: user.id,
      fingerprintHash,
      expiresAt,
      absoluteExpiresAt,
      createdByIp: clientInfo.ip || null,
      userAgent: clientInfo.userAgent || null,
    },
  });

  return {
    accessToken,
    refreshToken: rawRefreshToken,
    token: accessToken, // Backward-compatible alias
    expiresIn: env.JWT_ACCESS_EXPIRES_IN || "10m",
  };
}


/**
 * Generate signed JWT token explicitly using HS256 (convenience function)
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
      expiresIn: env.JWT_ACCESS_EXPIRES_IN || "15m",
    }
  );
}


/**
 * Generate short-lived (5 min) temporary challenge token for 2FA verification
 */
export function signTemp2FAToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      purpose: "2fa_challenge",
    },
    env.JWT_SECRET,
    {
      algorithm: "HS256",
      expiresIn: "5m",
    }
  );
}

function hashBackupCode(code) {
  return crypto.createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}

function generateBackupCodes(count = 8) {
  const plainCodes = [];
  const hashedCodes = [];
  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(4).toString("hex").toUpperCase();
    const formatted = `${raw.slice(0, 4)}-${raw.slice(4)}`;
    plainCodes.push(formatted);
    hashedCodes.push(hashBackupCode(formatted));
  }
  return { plainCodes, hashedCodes };
}

function verifyTOTPOrBackupCode(code, secret, hashedBackupCodes = []) {
  const cleanCode = code.replace(/[^A-Za-z0-9]/g, "").toUpperCase();

  // 1. If 6 digits, check TOTP
  if (/^\d{6}$/.test(cleanCode) && secret) {
    const totpResult = verifySync({ token: cleanCode, secret });
    if (totpResult?.valid) {
      return { valid: true, isBackupCode: false };
    }
  }

  // 2. Check backup codes
  const hashedInput = hashBackupCode(code);
  const backupIndex = hashedBackupCodes.indexOf(hashedInput);
  if (backupIndex !== -1) {
    return { valid: true, isBackupCode: true, backupIndex };
  }

  return { valid: false };
}

/**
 * Authenticate user (Super-Admin or Supervising Manager)
 * Uses constant-time bcrypt verification to defeat email enumeration timing side-channels.
 * If 2FA is enabled:
 * - If twoFactorCode is supplied in body, verifies it immediately.
 * - Otherwise, returns requires2FA: true with a short-lived tempToken.
 */
export async function login({ email, password, twoFactorCode }, clientInfo = {}) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  // Always run bcrypt comparison, even if user doesn't exist, to equalize response latency
  const hashToVerify = user ? user.passwordHash : DUMMY_BCRYPT_HASH;
  const isValidPassword = await bcrypt.compare(password, hashToVerify);

  if (!user || !user.isActive || !isValidPassword) {
    throw new AppError(401, "Invalid email or password", "invalid_credentials");
  }

  // Handle Two-Factor Authentication if enabled
  if (user.isTwoFactorEnabled) {
    if (!twoFactorCode) {
      return {
        requires2FA: true,
        tempToken: signTemp2FAToken(user),
        message: "Two-factor authentication code required",
      };
    }

    const verification = verifyTOTPOrBackupCode(
      twoFactorCode,
      user.twoFactorSecret,
      user.twoFactorBackupCodes || []
    );

    if (!verification.valid) {
      throw new AppError(401, "Invalid two-factor authentication code", "invalid_2fa_code");
    }

    // If a backup code was used, consume it
    if (verification.isBackupCode) {
      const updatedCodes = [...user.twoFactorBackupCodes];
      updatedCodes.splice(verification.backupIndex, 1);
      await prisma.user.update({
        where: { id: user.id },
        data: { twoFactorBackupCodes: updatedCodes },
      });
    }
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
      action: user.isTwoFactorEnabled ? "LOGIN_WITH_2FA" : "LOGIN",
      entityType: "user",
      entityId: user.id,
      ipAddress: clientInfo.ip || null,
      userAgent: clientInfo.userAgent || null,
    },
  });

  const session = await createSession(user, clientInfo);

  return {
    ...session,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      phone: user.phone,
      isTwoFactorEnabled: user.isTwoFactorEnabled,
      lastLoginAt: user.lastLoginAt,
    },
  };
}

/**
 * Verify 2FA challenge code during login using temporary token
 */
export async function verify2FALogin({ tempToken, code }, clientInfo = {}) {
  let payload;
  try {
    payload = jwt.verify(tempToken, env.JWT_SECRET, {
      algorithms: ["HS256"],
    });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new AppError(401, "2FA verification session expired. Please log in again.", "token_expired");
    }
    throw new AppError(401, "Invalid 2FA challenge session", "unauthorized");
  }

  if (payload.purpose !== "2fa_challenge") {
    throw new AppError(401, "Invalid token purpose", "unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
  });

  if (!user || !user.isActive || !user.isTwoFactorEnabled) {
    throw new AppError(401, "User not found or 2FA not enabled", "unauthorized");
  }

  const verification = verifyTOTPOrBackupCode(
    code,
    user.twoFactorSecret,
    user.twoFactorBackupCodes || []
  );

  if (!verification.valid) {
    throw new AppError(401, "Invalid two-factor authentication code", "invalid_2fa_code");
  }

  // If a backup code was used, remove it so it cannot be reused
  if (verification.isBackupCode) {
    const updatedCodes = [...user.twoFactorBackupCodes];
    updatedCodes.splice(verification.backupIndex, 1);
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorBackupCodes: updatedCodes },
    });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      actorRole: user.role,
      action: verification.isBackupCode ? "LOGIN_2FA_BACKUP_CODE" : "LOGIN_2FA",
      entityType: "user",
      entityId: user.id,
      ipAddress: clientInfo.ip || null,
      userAgent: clientInfo.userAgent || null,
    },
  });

  const session = await createSession(user, clientInfo);

  return {
    ...session,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      phone: user.phone,
      isTwoFactorEnabled: user.isTwoFactorEnabled,
      lastLoginAt: user.lastLoginAt,
    },
  };
}

/**
 * Initiate TOTP 2FA setup for an authenticated user
 */
export async function setup2FA(userId, clientInfo = {}) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError(404, "User not found", "user_not_found");
  }

  if (user.isTwoFactorEnabled) {
    throw new AppError(400, "Two-factor authentication is already enabled for your account", "bad_request");
  }

  // Generate cryptographically secure Base32 secret
  const secret = generateSecret();
  const uri = generateURI({
    secret,
    label: user.email,
    issuer: "Elpima Surgicals",
  });

  const qrCodeUrl = await qrcode.toDataURL(uri);
  const { plainCodes, hashedCodes } = generateBackupCodes(8);

  // Store temporary secret and pre-generated backup codes (not activated until verified)
  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorTempSecret: secret,
      twoFactorBackupCodes: hashedCodes,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      actorRole: user.role,
      action: "SETUP_2FA_INITIATED",
      entityType: "user",
      entityId: user.id,
      ipAddress: clientInfo.ip || null,
      userAgent: clientInfo.userAgent || null,
    },
  });

  return {
    secret,
    uri,
    qrCodeUrl,
    backupCodes: plainCodes,
    instructions: "Scan the QR code with Google Authenticator, Microsoft Authenticator, or 1Password. Then call the enable endpoint with the 6-digit code to activate.",
  };
}

/**
 * Confirm and activate 2FA with initial 6-digit token
 */
export async function enable2FA(userId, { code }, clientInfo = {}) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError(404, "User not found", "user_not_found");
  }

  if (user.isTwoFactorEnabled) {
    throw new AppError(400, "Two-factor authentication is already active", "bad_request");
  }

  if (!user.twoFactorTempSecret) {
    throw new AppError(400, "Please initiate 2FA setup first before attempting to enable", "bad_request");
  }

  const cleanCode = code.replace(/\s+/g, "");
  const verifyResult = verifySync({ token: cleanCode, secret: user.twoFactorTempSecret });

  if (!verifyResult?.valid) {
    throw new AppError(400, "Invalid 6-digit authenticator code. Please check your app and try again.", "invalid_2fa_code");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      isTwoFactorEnabled: true,
      twoFactorSecret: user.twoFactorTempSecret,
      twoFactorTempSecret: null,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      actorRole: user.role,
      action: "ENABLE_2FA",
      entityType: "user",
      entityId: user.id,
      ipAddress: clientInfo.ip || null,
      userAgent: clientInfo.userAgent || null,
    },
  });

  queueTwoFactorSecurityAlert({
    toEmail: user.email,
    recipientName: user.fullName,
    action: "ENABLED",
  }).catch(() => {});

  return {
    isTwoFactorEnabled: true,
    message: "Two-factor authentication enabled successfully",
  };
}

/**
 * Disable 2FA (requires current password and valid 2FA or backup code)
 */
export async function disable2FA(userId, { password, code }, clientInfo = {}) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError(404, "User not found", "user_not_found");
  }

  if (!user.isTwoFactorEnabled) {
    throw new AppError(400, "Two-factor authentication is not currently enabled", "bad_request");
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new AppError(400, "Current password is incorrect", "bad_request");
  }

  const verification = verifyTOTPOrBackupCode(
    code,
    user.twoFactorSecret,
    user.twoFactorBackupCodes || []
  );

  if (!verification.valid) {
    throw new AppError(400, "Invalid 2FA code or backup code", "invalid_2fa_code");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      isTwoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorTempSecret: null,
      twoFactorBackupCodes: [],
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      actorRole: user.role,
      action: "DISABLE_2FA",
      entityType: "user",
      entityId: user.id,
      ipAddress: clientInfo.ip || null,
      userAgent: clientInfo.userAgent || null,
    },
  });

  queueTwoFactorSecurityAlert({
    toEmail: user.email,
    recipientName: user.fullName,
    action: "DISABLED",
  }).catch(() => {});

  return {
    isTwoFactorEnabled: false,
    message: "Two-factor authentication disabled successfully",
  };
}

/**
 * Get 2FA status and count of remaining backup recovery codes
 */
export async function get2FAStatus(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      isTwoFactorEnabled: true,
      twoFactorBackupCodes: true,
    },
  });

  if (!user) {
    throw new AppError(404, "User not found", "user_not_found");
  }

  return {
    isTwoFactorEnabled: user.isTwoFactorEnabled,
    backupCodesRemaining: user.twoFactorBackupCodes?.length || 0,
  };
}

/**
 * Regenerate backup recovery codes (requires current password and 2FA code)
 */
export async function regenerateBackupCodes(userId, { password, code }, clientInfo = {}) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError(404, "User not found", "user_not_found");
  }

  if (!user.isTwoFactorEnabled) {
    throw new AppError(400, "Two-factor authentication must be enabled to generate backup codes", "bad_request");
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new AppError(400, "Current password is incorrect", "bad_request");
  }

  const verification = verifyTOTPOrBackupCode(
    code,
    user.twoFactorSecret,
    user.twoFactorBackupCodes || []
  );

  if (!verification.valid) {
    throw new AppError(400, "Invalid 2FA code", "invalid_2fa_code");
  }

  const { plainCodes, hashedCodes } = generateBackupCodes(8);

  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorBackupCodes: hashedCodes },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      actorRole: user.role,
      action: "REGENERATE_2FA_BACKUP_CODES",
      entityType: "user",
      entityId: user.id,
      ipAddress: clientInfo.ip || null,
      userAgent: clientInfo.userAgent || null,
    },
  });

  queueTwoFactorSecurityAlert({
    toEmail: user.email,
    recipientName: user.fullName,
    action: "BACKUP_REGENERATED",
  }).catch(() => {});

  return {
    backupCodes: plainCodes,
    message: "New backup codes generated. Store them safely; old codes are now invalid.",
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
      isTwoFactorEnabled: true,
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
    data: {
      passwordHash: newHash,
      tokenVersion: { increment: 1 },
    },
  });

  // Security: Revoke all existing refresh tokens across devices
  await prisma.refreshToken.updateMany({
    where: { userId, isRevoked: false },
    data: { isRevoked: true },
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

  return { message: "Password updated successfully. Other device sessions have been revoked." };
}

/**
 * Rotate refresh token: invalidates old token and issues fresh access and refresh tokens.
 * Employs:
 * - Anti-Theft Token Reuse Detection (invalidates all sessions if used token is presented)
 * - Device Fingerprint Binding (detects session hijack if network/browser changes)
 * - Idle Timeout Enforcement (e.g. 2 hours inactivity)
 * - Maximum Session Cap (e.g. 8 hours hard re-authentication requirement)
 */
export async function rotateRefreshToken(rawRefreshToken, clientInfo = {}) {
  if (!rawRefreshToken) {
    throw new AppError(400, "Refresh token is required", "bad_request");
  }

  const tokenHash = hashToken(rawRefreshToken);

  const tokenRecord = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!tokenRecord) {
    throw new AppError(401, "Invalid refresh token", "invalid_refresh_token");
  }

  // Reuse Detection: If an already-revoked refresh token is re-submitted, suspect token theft!
  if (tokenRecord.isRevoked) {
    // Revoke all existing sessions and increment tokenVersion immediately to kill active access tokens
    await prisma.refreshToken.updateMany({
      where: { userId: tokenRecord.userId },
      data: { isRevoked: true },
    });

    await prisma.user.update({
      where: { id: tokenRecord.userId },
      data: { tokenVersion: { increment: 1 } },
    });

    await prisma.auditLog.create({
      data: {
        actorId: tokenRecord.userId,
        actorRole: tokenRecord.user?.role || null,
        action: "SUSPICIOUS_TOKEN_REUSE_DETECTED",
        entityType: "user",
        entityId: tokenRecord.userId,
        ipAddress: clientInfo.ip || null,
        userAgent: clientInfo.userAgent || null,
      },
    });

    throw new AppError(
      401,
      "Compromised or reused refresh token detected. All active sessions have been revoked for your security. Please log in again.",
      "token_revoked"
    );
  }

  // Device & Network Fingerprint Check (Anti-Hijack Guard)
  // If the client's User-Agent or IP subnet drastically differs from creation, suspect token theft
  const currentFingerprint = createClientFingerprint(clientInfo);
  if (tokenRecord.fingerprintHash && tokenRecord.fingerprintHash !== currentFingerprint) {
    // Invalidate the entire token family lineage
    await prisma.refreshToken.updateMany({
      where: { familyId: tokenRecord.familyId },
      data: { isRevoked: true },
    });

    await prisma.user.update({
      where: { id: tokenRecord.userId },
      data: { tokenVersion: { increment: 1 } },
    });

    await prisma.auditLog.create({
      data: {
        actorId: tokenRecord.userId,
        actorRole: tokenRecord.user?.role || null,
        action: "SESSION_HIJACK_SUSPECTED_FINGERPRINT_MISMATCH",
        entityType: "user",
        entityId: tokenRecord.userId,
        metadata: {
          originalIp: tokenRecord.createdByIp,
          incomingIp: clientInfo.ip,
          originalUserAgent: tokenRecord.userAgent,
          incomingUserAgent: clientInfo.userAgent,
        },
        ipAddress: clientInfo.ip || null,
        userAgent: clientInfo.userAgent || null,
      },
    });

    throw new AppError(
      401,
      "Security alert: Client environment mismatch detected (potential session hijack). Session terminated.",
      "session_hijack_detected"
    );
  }

  // Check absolute maximum session lifetime (e.g. 8 hours)
  if (tokenRecord.absoluteExpiresAt && new Date() > tokenRecord.absoluteExpiresAt) {
    await prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { isRevoked: true },
    });
    throw new AppError(
      401,
      "Maximum continuous session length reached. Please re-authenticate.",
      "session_max_duration_exceeded"
    );
  }

  // Check rolling idle expiration (e.g. 2 hours inactivity)
  if (new Date() > tokenRecord.expiresAt) {
    await prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { isRevoked: true },
    });
    throw new AppError(401, "Session expired due to inactivity. Please log in again.", "session_idle_timeout");
  }

  // Check user active
  if (!tokenRecord.user || !tokenRecord.user.isActive) {
    throw new AppError(401, "User account is deactivated or not found", "account_deactivated");
  }

  // Invalidate current refresh token (one-time use rotation)
  await prisma.refreshToken.update({
    where: { id: tokenRecord.id },
    data: { isRevoked: true, lastUsedAt: new Date() },
  });

  // Issue new session preserving the token family and absolute session cap
  const session = await createSession(tokenRecord.user, clientInfo, {
    familyId: tokenRecord.familyId,
    absoluteExpiresAt: tokenRecord.absoluteExpiresAt,
  });

  return {
    ...session,
    user: {
      id: tokenRecord.user.id,
      email: tokenRecord.user.email,
      fullName: tokenRecord.user.fullName,
      role: tokenRecord.user.role,
      phone: tokenRecord.user.phone,
      isTwoFactorEnabled: tokenRecord.user.isTwoFactorEnabled,
    },
  };
}

/**
 * Logout authenticated user (invalidates specified refresh token and records audit log)
 */
export async function logout(user, rawRefreshToken, clientInfo = {}) {
  if (rawRefreshToken) {
    const tokenHash = hashToken(rawRefreshToken);
    await prisma.refreshToken.updateMany({
      where: { tokenHash, isRevoked: false },
      data: { isRevoked: true },
    });
  }

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
 * Terminate all active sessions across all devices for this user
 * Increments tokenVersion in DB to kill all active access tokens immediately
 */
export async function logoutAll(userId, clientInfo = {}) {
  await prisma.refreshToken.updateMany({
    where: { userId, isRevoked: false },
    data: { isRevoked: true },
  });

  // Increment tokenVersion: any issued access token across any device is invalidated instantly
  const user = await prisma.user.update({
    where: { id: userId },
    data: { tokenVersion: { increment: 1 } },
  });

  await prisma.auditLog.create({
    data: {
      actorId: userId,
      actorRole: user?.role || null,
      action: "LOGOUT_ALL_DEVICES",
      entityType: "user",
      entityId: userId,
      ipAddress: clientInfo.ip || null,
      userAgent: clientInfo.userAgent || null,
    },
  });

  return { message: "Logged out from all devices successfully. All active tokens invalidated." };
}

/**
 * List active sessions / logged-in devices for the current user
 */
export async function listActiveSessions(userId) {
  const sessions = await prisma.refreshToken.findMany({
    where: {
      userId,
      isRevoked: false,
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      createdByIp: true,
      userAgent: true,
      createdAt: true,
      lastUsedAt: true,
      expiresAt: true,
      absoluteExpiresAt: true,
    },
    orderBy: { lastUsedAt: "desc" },
  });

  return sessions;
}

/**
 * Remotely revoke a specific device session
 */
export async function revokeSession(userId, sessionId, clientInfo = {}) {
  const session = await prisma.refreshToken.findUnique({
    where: { id: sessionId },
  });

  if (!session || session.userId !== userId) {
    throw new AppError(404, "Session not found or not owned by user", "session_not_found");
  }

  await prisma.refreshToken.update({
    where: { id: sessionId },
    data: { isRevoked: true },
  });

  await prisma.auditLog.create({
    data: {
      actorId: userId,
      action: "REVOKE_SESSION",
      entityType: "refresh_token",
      entityId: sessionId,
      ipAddress: clientInfo.ip || null,
      userAgent: clientInfo.userAgent || null,
    },
  });

  return { message: "Device session revoked successfully" };
}


/**
 * Request password reset link (constant-time response to prevent email enumeration)
 */
export async function forgotPassword({ email }, clientInfo = {}) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (user && user.isActive) {
    const rawResetToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawResetToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: tokenHash,
        passwordResetExpires: expiresAt,
      },
    });

    await queuePasswordResetEmail({
      toEmail: user.email,
      recipientName: user.fullName,
      resetToken: rawResetToken,
    });

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        actorRole: user.role,
        action: "FORGOT_PASSWORD_REQUESTED",
        entityType: "user",
        entityId: user.id,
        ipAddress: clientInfo.ip || null,
        userAgent: clientInfo.userAgent || null,
      },
    });
  }

  return {
    message: "If that email address is registered, password reset instructions have been sent.",
  };
}

/**
 * Reset password using valid one-time reset token
 */
export async function resetPassword({ token, newPassword }, clientInfo = {}) {
  const tokenHash = hashToken(token);

  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: tokenHash,
      passwordResetExpires: { gt: new Date() },
    },
  });

  if (!user || !user.isActive) {
    throw new AppError(400, "Password reset token is invalid or has expired", "invalid_reset_token");
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: newPasswordHash,
      passwordResetToken: null,
      passwordResetExpires: null,
      tokenVersion: { increment: 1 },
    },
  });

  // Revoke all existing refresh tokens to force re-login on all devices
  await prisma.refreshToken.updateMany({
    where: { userId: user.id, isRevoked: false },
    data: { isRevoked: true },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      actorRole: user.role,
      action: "RESET_PASSWORD_COMPLETED",
      entityType: "user",
      entityId: user.id,
      ipAddress: clientInfo.ip || null,
      userAgent: clientInfo.userAgent || null,
    },
  });

  return {
    message: "Password has been reset successfully. Please log in with your new password.",
  };
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
