import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

describe("Health Route & API Baseline", () => {
  const app = createApp();

  it("GET /health should return 200 with service details and correlation ID", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.service).toBe("elpima-api");
    expect(res.headers["x-request-id"]).toBeDefined();
  });

  it("GET /api/v1/non-existent-route should return structured 404 error envelope", async () => {
    const res = await request(app).get("/api/v1/non-existent-route");

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.kind).toBe("not_found");
    expect(res.body.error.correlationId).toBeDefined();
  });
});
