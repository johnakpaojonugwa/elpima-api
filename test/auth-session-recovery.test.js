import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../src/config/prisma.js";
import * as authService from "../src/modules/auth/service.js";

describe("Refresh Tokens & Password Recovery Lifecycle", () => {
  const mockUser = {
    id: "user-session-123",
    email: "manager@elpima.com",
    fullName: "Theater Manager",
    role: "SUPERVISING_MANAGER",
    passwordHash: "",
    isActive: true,
    isTwoFactorEnabled: false,
    twoFactorSecret: null,
    twoFactorTempSecret: null,
    twoFactorBackupCodes: [],
    passwordResetToken: null,
    passwordResetExpires: null,
    lastLoginAt: null,
  };

  beforeEach(async () => {
    vi.restoreAllMocks();
    mockUser.passwordHash = await bcrypt.hash("InitialP@ss123", 10);
    mockUser.passwordResetToken = null;
    mockUser.passwordResetExpires = null;
    vi.spyOn(prisma.auditLog, "create").mockResolvedValue({});
    vi.spyOn(prisma.user, "update").mockResolvedValue({ ...mockUser });
    vi.spyOn(prisma.refreshToken, "create").mockResolvedValue({});
    vi.spyOn(prisma.refreshToken, "update").mockResolvedValue({});
    vi.spyOn(prisma.refreshToken, "updateMany").mockResolvedValue({ count: 1 });
  });

  describe("Refresh Token Rotation & Security", () => {
    it("should issue access and refresh token pair on login", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({ ...mockUser });
      vi.spyOn(prisma.user, "update").mockResolvedValue({ ...mockUser });

      const result = await authService.login({
        email: mockUser.email,
        password: "InitialP@ss123",
      });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.token).toBe(result.accessToken);
      expect(result.user.email).toBe(mockUser.email);
    });

    it("should successfully rotate refresh token and issue new token pair", async () => {
      const rawRefreshToken = "sample-raw-refresh-token-1234567890";
      const tokenHash = crypto.createHash("sha256").update(rawRefreshToken).digest("hex");
      const clientInfo = { ip: "192.168.1.50", userAgent: "Mozilla/5.0 Chrome/120.0" };
      const fingerprintHash = authService.createClientFingerprint(clientInfo);

      vi.spyOn(prisma.refreshToken, "findUnique").mockResolvedValue({
        id: "rt-1",
        tokenHash,
        userId: mockUser.id,
        isRevoked: false,
        fingerprintHash,
        expiresAt: new Date(Date.now() + 86400000), // In future
        absoluteExpiresAt: new Date(Date.now() + 86400000),
        user: { ...mockUser },
      });

      const updateTokenSpy = vi.spyOn(prisma.refreshToken, "update").mockResolvedValue({});

      const rotated = await authService.rotateRefreshToken(rawRefreshToken, clientInfo);

      expect(rotated.accessToken).toBeDefined();
      expect(rotated.refreshToken).toBeDefined();
      expect(rotated.refreshToken).not.toBe(rawRefreshToken);
      expect(updateTokenSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "rt-1" },
          data: expect.objectContaining({ isRevoked: true }),
        })
      );
    });

    it("should detect session hijack if client fingerprint (IP / User-Agent) changes", async () => {
      const rawRefreshToken = "legitimate-token-12345";
      const tokenHash = crypto.createHash("sha256").update(rawRefreshToken).digest("hex");

      // Original session created from legitimate admin laptop
      const originalClient = { ip: "102.89.44.12", userAgent: "Mozilla/5.0 MacOS" };
      const originalFingerprint = authService.createClientFingerprint(originalClient);

      // Stolen token used by attacker from a different IP and browser
      const attackerClient = { ip: "197.210.65.88", userAgent: "Curl/8.0 KaliLinux" };

      vi.spyOn(prisma.refreshToken, "findUnique").mockResolvedValue({
        id: "rt-hijacked",
        familyId: "fam-1",
        tokenHash,
        userId: mockUser.id,
        isRevoked: false,
        fingerprintHash: originalFingerprint, // Legitimate fingerprint
        expiresAt: new Date(Date.now() + 86400000),
        absoluteExpiresAt: new Date(Date.now() + 86400000),
        user: { ...mockUser },
      });

      const revokeFamilySpy = vi.spyOn(prisma.refreshToken, "updateMany").mockResolvedValue({ count: 2 });
      const userUpdateSpy = vi.spyOn(prisma.user, "update").mockResolvedValue({ ...mockUser });

      await expect(
        authService.rotateRefreshToken(rawRefreshToken, attackerClient)
      ).rejects.toThrow("Client environment mismatch detected (potential session hijack)");

      // Verified: Entire token family killed & user tokenVersion incremented to kill active access tokens
      expect(revokeFamilySpy).toHaveBeenCalledWith({
        where: { familyId: "fam-1" },
        data: { isRevoked: true },
      });
      expect(userUpdateSpy).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { tokenVersion: { increment: 1 } },
      });
    });

    it("should reject refresh token if rolling idle timeout is exceeded", async () => {
      const rawRefreshToken = "idle-expired-token";
      const tokenHash = crypto.createHash("sha256").update(rawRefreshToken).digest("hex");
      const clientInfo = { ip: "127.0.0.1", userAgent: "Vitest" };
      const fingerprintHash = authService.createClientFingerprint(clientInfo);

      vi.spyOn(prisma.refreshToken, "findUnique").mockResolvedValue({
        id: "rt-idle",
        tokenHash,
        userId: mockUser.id,
        isRevoked: false,
        fingerprintHash,
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
        absoluteExpiresAt: new Date(Date.now() + 86400000),
        user: { ...mockUser },
      });

      vi.spyOn(prisma.refreshToken, "update").mockResolvedValue({});

      await expect(
        authService.rotateRefreshToken(rawRefreshToken, clientInfo)
      ).rejects.toThrow("Session expired due to inactivity");
    });

    it("should detect token reuse of a revoked token and invalidate all user sessions", async () => {
      const revokedToken = "already-revoked-token-12345";
      const tokenHash = crypto.createHash("sha256").update(revokedToken).digest("hex");

      vi.spyOn(prisma.refreshToken, "findUnique").mockResolvedValue({
        id: "rt-compromised",
        tokenHash,
        userId: mockUser.id,
        isRevoked: true, // Already used/revoked!
        expiresAt: new Date(Date.now() + 86400000),
        absoluteExpiresAt: new Date(Date.now() + 86400000),
        user: { ...mockUser },
      });

      const revokeAllSpy = vi.spyOn(prisma.refreshToken, "updateMany").mockResolvedValue({ count: 5 });
      vi.spyOn(prisma.user, "update").mockResolvedValue({ ...mockUser });

      await expect(
        authService.rotateRefreshToken(revokedToken)
      ).rejects.toThrow("Compromised or reused refresh token detected");

      expect(revokeAllSpy).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
        data: { isRevoked: true },
      });
    });
  });

  describe("Password Recovery (Forgot & Reset Password)", () => {
    it("should generate a secure reset token and dispatch reset email", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({ ...mockUser });
      const userUpdateSpy = vi.spyOn(prisma.user, "update").mockResolvedValue({ ...mockUser });

      const response = await authService.forgotPassword({ email: mockUser.email });

      expect(response.message).toContain("password reset instructions have been sent");
      expect(userUpdateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockUser.id },
          data: expect.objectContaining({
            passwordResetToken: expect.any(String),
            passwordResetExpires: expect.any(Date),
          }),
        })
      );
    });

    it("should successfully reset password with valid token and invalidate refresh tokens", async () => {
      const rawToken = "super-secret-reset-token-32-chars";
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

      vi.spyOn(prisma.user, "findFirst").mockResolvedValue({
        ...mockUser,
        passwordResetToken: tokenHash,
        passwordResetExpires: new Date(Date.now() + 3600000),
      });

      const userUpdateSpy = vi.spyOn(prisma.user, "update").mockResolvedValue({ ...mockUser });
      const revokeTokensSpy = vi.spyOn(prisma.refreshToken, "updateMany").mockResolvedValue({ count: 2 });

      const result = await authService.resetPassword({
        token: rawToken,
        newPassword: "BrandNewSecurePassword123!",
      });

      expect(result.message).toContain("Password has been reset successfully");
      expect(userUpdateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockUser.id },
          data: expect.objectContaining({
            passwordResetToken: null,
            passwordResetExpires: null,
          }),
        })
      );
      expect(revokeTokensSpy).toHaveBeenCalledWith({
        where: { userId: mockUser.id, isRevoked: false },
        data: { isRevoked: true },
      });
    });

    it("should reject password reset if token is expired or invalid", async () => {
      vi.spyOn(prisma.user, "findFirst").mockResolvedValue(null);

      await expect(
        authService.resetPassword({
          token: "invalid-or-expired-token",
          newPassword: "BrandNewSecurePassword123!",
        })
      ).rejects.toThrow("Password reset token is invalid or has expired");
    });
  });

  describe("Session Management & Multi-Device Logout", () => {
    it("should revoke all active refresh tokens on logoutAll", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({ ...mockUser });
      const revokeAllSpy = vi.spyOn(prisma.refreshToken, "updateMany").mockResolvedValue({ count: 3 });

      const result = await authService.logoutAll(mockUser.id);

      expect(result.message).toContain("Logged out from all devices");
      expect(revokeAllSpy).toHaveBeenCalledWith({
        where: { userId: mockUser.id, isRevoked: false },
        data: { isRevoked: true },
      });
    });
  });
});
