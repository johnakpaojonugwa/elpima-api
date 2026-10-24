import { describe, it, expect } from "vitest";
import { submitQuoteSchema } from "../src/modules/quotes/validation.js";
import { loginSchema } from "../src/modules/auth/validation.js";

describe("Validation Schemas", () => {
  it("should reject quote submission when items array is empty", () => {
    const result = submitQuoteSchema.safeParse({
      customerName: "Dr. Okon",
      customerPhone: "08012345678",
      items: [],
    });

    expect(result.success).toBe(false);
  });

  it("should validate quote submission with valid items", () => {
    const result = submitQuoteSchema.safeParse({
      customerName: "Dr. Okon",
      customerPhone: "08012345678",
      hospitalClinic: "St. Nicholas Hospital",
      items: [
        {
          productId: "123e4567-e89b-12d3-a456-426614174000",
          quantity: 3,
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("should reject login with short password", () => {
    const result = loginSchema.safeParse({
      email: "admin@elpima.com",
      password: "123",
    });

    expect(result.success).toBe(false);
  });
});
