import { describe, it, expect } from "vitest";
import { cacheGet, cacheSet, cacheDel, cacheInvalidatePattern } from "../src/config/redis.js";

describe("Caching Layer (Redis & Fallback)", () => {
  it("stores and retrieves cached items", async () => {
    await cacheSet("test:key1", { name: "Surgical Kit", inStock: true }, 60);

    const retrieved = await cacheGet("test:key1");
    expect(retrieved).toEqual({ name: "Surgical Kit", inStock: true });
  });

  it("returns null for non-existent cache keys", async () => {
    const nonExistent = await cacheGet("test:does_not_exist");
    expect(nonExistent).toBeNull();
  });

  it("deletes cached items on demand", async () => {
    await cacheSet("test:to_delete", "temporary value", 60);
    await cacheDel("test:to_delete");

    const result = await cacheGet("test:to_delete");
    expect(result).toBeNull();
  });

  it("invalidates keys matching pattern prefix", async () => {
    await cacheSet("catalog:item1", "value1", 60);
    await cacheSet("catalog:item2", "value2", 60);
    await cacheSet("other:item3", "value3", 60);

    await cacheInvalidatePattern("catalog:");

    expect(await cacheGet("catalog:item1")).toBeNull();
    expect(await cacheGet("catalog:item2")).toBeNull();
    expect(await cacheGet("other:item3")).toBe("value3");
  });
});
