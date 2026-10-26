import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateSync } from "otplib";
import bcrypt from "bcryptjs";
import { prisma } from "../src/config/prisma.js";
import * as authService from "../src/modules/auth/service.js";

describe("Two-Factor Authentication (TOTP Authenticator App)", () => {
  const mockUser = {
    id: "user-uuid-1",
    email: "admin@elpima.com",
    fullName: "Chief Surgeon",
    role: "SUPER_ADMIN",
    passwordHash: "",
    isActive: true,
    isTwoFactorEnabled: false,
    twoFactorSecret: null,
    twoFactorTempSecret: null,
    twoFactorBackupCodes: [],
    lastLoginAt: null,
  };

  beforeEach(async () => {
    vi.restoreAllMocks();
    mockUser.passwordHash = await bcrypt.hash("P@ssword123!", 10);
    mockUser.isTwoFactorEnabled = false;
    mockUser.twoFactorSecret = null;
    mockUser.twoFactorTempSecret = null;
    mockUser.twoFactorBackupCodes = [];
    vi.spyOn(prisma.refreshToken, "create").mockResolvedValue({});
  });

  it("should initiate 2FA setup and return secret, qrCodeUrl, and 8 backup codes", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue({ ...mockUser });
    const updateSpy = vi.spyOn(prisma.user, "update").mockImplementation(async ({ data }) => {
      mockUser.twoFactorTempSecret = data.twoFactorTempSecret;
      mockUser.twoFactorBackupCodes = data.twoFactorBackupCodes;
      return { ...mockUser, ...data };
    });
    vi.spyOn(prisma.auditLog, "create").mockResolvedValue({});

    const result = await authService.setup2FA(mockUser.id);

    expect(result.secret).toBeDefined();
    expect(result.uri).toContain("otpauth://totp/Elpima%20Surgicals:admin%40elpima.com");
    expect(result.qrCodeUrl).toMatch(/^data:image\/png;base64,/);
    expect(result.backupCodes).toHaveLength(8);
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: mockUser.id },
        data: expect.objectContaining({
          twoFactorTempSecret: expect.any(String),
          twoFactorBackupCodes: expect.any(Array),
        }),
      })
    );
  });

  it("should reject enabling 2FA with an invalid code", async () => {
    mockUser.twoFactorTempSecret = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP"; // 32 chars Base32 = 20 bytes
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue({ ...mockUser });

    await expect(
      authService.enable2FA(mockUser.id, { code: "000000" })
    ).rejects.toThrow("Invalid 6-digit authenticator code");
  });

  it("should successfully activate 2FA when given a valid TOTP token", async () => {
    const testSecret = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";
    mockUser.twoFactorTempSecret = testSecret;
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue({ ...mockUser });
    const updateSpy = vi.spyOn(prisma.user, "update").mockResolvedValue({
      ...mockUser,
      isTwoFactorEnabled: true,
      twoFactorSecret: testSecret,
      twoFactorTempSecret: null,
    });
    vi.spyOn(prisma.auditLog, "create").mockResolvedValue({});

    const validCode = generateSync({ secret: testSecret });
    const result = await authService.enable2FA(mockUser.id, { code: validCode });

    expect(result.isTwoFactorEnabled).toBe(true);
    expect(updateSpy).toHaveBeenCalledWith({
      where: { id: mockUser.id },
      data: {
        isTwoFactorEnabled: true,
        twoFactorSecret: testSecret,
        twoFactorTempSecret: null,
      },
    });
  });

  it("should challenge with requires2FA when user logs in with 2FA enabled", async () => {
    const testSecret = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";
    mockUser.isTwoFactorEnabled = true;
    mockUser.twoFactorSecret = testSecret;
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue({ ...mockUser });

    const loginResult = await authService.login({
      email: mockUser.email,
      password: "P@ssword123!",
    });

    expect(loginResult.requires2FA).toBe(true);
    expect(loginResult.tempToken).toBeDefined();
    expect(loginResult.token).toBeUndefined();
  });

  it("should complete login when valid 2FA code is provided via verify2FALogin", async () => {
    const testSecret = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";
    mockUser.isTwoFactorEnabled = true;
    mockUser.twoFactorSecret = testSecret;
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue({ ...mockUser });
    vi.spyOn(prisma.user, "update").mockResolvedValue({ ...mockUser });
    vi.spyOn(prisma.auditLog, "create").mockResolvedValue({});

    const tempToken = authService.signTemp2FAToken(mockUser);
    const validCode = generateSync({ secret: testSecret });

    const result = await authService.verify2FALogin({
      tempToken,
      code: validCode,
    });

    expect(result.token).toBeDefined();
    expect(result.user.email).toBe(mockUser.email);
    expect(result.user.isTwoFactorEnabled).toBe(true);
  });

});
