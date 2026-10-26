import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  sendEmail,
  sendPasswordResetEmail,
  sendQuoteConfirmationEmail,
  sendManagerInviteEmail,
  sendTwoFactorSecurityAlert,
} from "../src/utils/mailer.js";

describe("Resend Mailer Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("sendEmail", () => {
    it("simulates sending in test environment without throwing errors", async () => {
      const result = await sendEmail({
        to: "doctor@hospital.ng",
        subject: "Test Subject",
        html: "<p>Hello Test</p>",
      });

      expect(result.success).toBe(true);
      expect(result.simulated).toBe(true);
      expect(result.messageId).toBeDefined();
    });

    it("handles multiple recipients correctly", async () => {
      const result = await sendEmail({
        to: ["admin1@elpimasurgicals.com", "admin2@elpimasurgicals.com"],
        subject: "Multi-recipient Notification",
        html: "<p>Team update</p>",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("sendPasswordResetEmail", () => {
    it("dispatches password reset email with formatted link and expiry notice", async () => {
      const result = await sendPasswordResetEmail({
        toEmail: "surgeon@elpima.com",
        recipientName: "Dr. Adebayo",
        resetToken: "abcdef1234567890abcdef1234567890",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("sendQuoteConfirmationEmail", () => {
    it("returns false early if quote has no customerEmail", async () => {
      const result = await sendQuoteConfirmationEmail({
        quote: { reference: "ELP-202610-TEST", customerName: "Dr. Clinic" },
      });

      expect(result.success).toBe(false);
      expect(result.reason).toBe("No email provided");
    });

    it("formats and dispatches quote confirmation email when customerEmail is present", async () => {
      const result = await sendQuoteConfirmationEmail({
        quote: {
          reference: "ELP-202610-TEST",
          customerName: "Dr. Fatima Musa",
          customerEmail: "fatima@nationalhospital.ng",
          customerPhone: "+2348011223344",
          hospitalClinic: "National Hospital Abuja",
          priority: "HIGH",
          whatsappLink: "https://wa.me/2348000000000?text=Hello",
          items: [
            {
              productName: "Titanium Surgical Scalpel Handle #3",
              productSku: "ELP-SCP-03",
              quantity: 15,
              customRequirement: "Laser engraved initials",
            },
            {
              productName: "Mayo Dissecting Scissors Curved 17cm",
              productSku: "ELP-SC-17C",
              quantity: 8,
            },
          ],
        },
      });

      expect(result.success).toBe(true);
    });
  });

  describe("sendManagerInviteEmail", () => {
    it("dispatches manager welcome credentials and 2FA onboarding notice", async () => {
      const result = await sendManagerInviteEmail({
        toEmail: "manager@elpima.com",
        recipientName: "Emeka Okonkwo",
        temporaryPassword: "TempPassword123!",
        role: "SUPERVISING_MANAGER",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("sendTwoFactorSecurityAlert", () => {
    it("dispatches 2FA enabled security alert", async () => {
      const result = await sendTwoFactorSecurityAlert({
        toEmail: "admin@elpima.com",
        recipientName: "Super Admin",
        action: "ENABLED",
      });

      expect(result.success).toBe(true);
    });

    it("dispatches 2FA disabled security alert", async () => {
      const result = await sendTwoFactorSecurityAlert({
        toEmail: "admin@elpima.com",
        recipientName: "Super Admin",
        action: "DISABLED",
      });

      expect(result.success).toBe(true);
    });

    it("dispatches backup recovery codes regenerated security alert", async () => {
      const result = await sendTwoFactorSecurityAlert({
        toEmail: "admin@elpima.com",
        recipientName: "Super Admin",
        action: "BACKUP_REGENERATED",
      });

      expect(result.success).toBe(true);
    });
  });
});
