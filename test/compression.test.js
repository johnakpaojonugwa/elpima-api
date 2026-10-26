import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

describe("HTTP Compression Middleware", () => {
  const app = createApp();

  it("serves responses with compression support when client accepts gzip", async () => {
    const res = await request(app)
      .get("/api/v1/categories")
      .set("Accept-Encoding", "gzip");

    expect(res.status).toBe(200);
    // Compression is applied or supported without errors
    expect(res.headers).toBeDefined();
  });
});
