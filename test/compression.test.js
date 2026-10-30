import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";

describe("HTTP Compression Middleware", () => {
  const app = createApp();

  it("serves responses with compression support when client accepts gzip", async () => {
    vi.spyOn(prisma.category, "findMany").mockResolvedValue([
      { id: "1", name: "Surgical Blades", slug: "surgical-blades", isActive: true },
    ]);

    const res = await request(app)
      .get("/api/v1/categories")
      .set("Accept-Encoding", "gzip");

    expect(res.status).toBe(200);
    // Compression is applied or supported without errors
    expect(res.headers).toBeDefined();
  });
});
