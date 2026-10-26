import { describe, it, expect } from "vitest";
import {
  queuePasswordResetEmail,
  queueQuoteConfirmationEmail,
  queueManagerInviteEmail,
  queueTwoFactorSecurityAlert,
  queueSalesDeskNotification,
} from "../src/queues/index.js";

describe("BullMQ Background Queue System", () => {
  it("enqueues and processes password reset email seamlessly", async () => {
    const result = await queuePasswordResetEmail({
      toEmail: "doctor@hospital.ng",
      recipientName: "Dr. Alabi",
      resetToken: "test-reset-token-12345",
    });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });

  it("enqueues and processes quote confirmation email", async () => {
    const result = await queueQuoteConfirmationEmail({
      quote: {
        reference: "ELP-202610-QUEUE",
        customerName: "Dr. Chinedu",
        customerEmail: "chinedu@clinic.ng",
        customerPhone: "+2348001122334",
        priority: "URGENT",
        items: [
          {
            productName: "Microsurgical Forceps 14cm",
            productSku: "ELP-FRC-14",
            quantity: 4,
          },
        ],
      },
    });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });

  it("enqueues and processes manager invitation email", async () => {
    const result = await queueManagerInviteEmail({
      toEmail: "newmanager@elpima.com",
      recipientName: "New Manager",
      temporaryPassword: "InitialPassword123!",
      role: "SUPERVISING_MANAGER",
    });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });

  it("enqueues and processes 2FA security alert", async () => {
    const result = await queueTwoFactorSecurityAlert({
      toEmail: "admin@elpima.com",
      recipientName: "Admin User",
      action: "ENABLED",
    });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });

  it("enqueues and processes sales desk notification", async () => {
    const quote = {
      reference: "ELP-202610-TEST-SALES",
      customerName: "Dr. Ibrahim",
      customerPhone: "+2348009988776",
      items: [{ productName: "Surgical Retractor", quantity: 2 }],
    };

    // notifySalesDesk is safe and doesn't throw even without webhook URL
    await expect(queueSalesDeskNotification(quote)).resolves.not.toThrow();
  });
});
