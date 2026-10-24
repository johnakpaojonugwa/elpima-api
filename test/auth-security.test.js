import { describe, it, expect, vi } from "vitest";
import jwt from "jsonwebtoken";
import { requireAuth } from "../src/middlewares/auth.js";
import { prisma } from "../src/config/prisma.js";
import { env } from "../src/config/env.js";

describe("Auth Security & JWT Hardening", () => {
  it("should reject token signed with unauthorized or unpinned algorithm (e.g. none)", async () => {
    // Manually forge an unpinned header
    const forgedToken = jwt.sign({ sub: "user-123" }, env.JWT_SECRET, { algorithm: "HS384" });

    const req = {
      headers: { authorization: `Bearer ${forgedToken}` },
    };
    const res = {};
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0][0];
    expect(error.statusCode).toBe(401);
    expect(error.message).toContain("Invalid authentication token");
  });

  it("should fail closed if an account has been deactivated in the database", async () => {
    const validToken = jwt.sign(
      { sub: "deactivated-user-id", email: "test@elpima.com", role: "SUPERVISING_MANAGER" },
      env.JWT_SECRET,
      { algorithm: "HS256" }
    );

    // Mock prisma to return a deactivated user
    vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce({
      id: "deactivated-user-id",
      email: "test@elpima.com",
      fullName: "Ex Staff",
      role: "SUPERVISING_MANAGER",
      isActive: false, // Deactivated!
    });

    const req = {
      headers: { authorization: `Bearer ${validToken}` },
    };
    const res = {};
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0][0];
    expect(error.statusCode).toBe(401);
    expect(error.kind).toBe("account_deactivated");
  });
});
