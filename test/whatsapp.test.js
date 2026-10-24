import { describe, it, expect } from "vitest";
import { buildWhatsAppQuoteUrl } from "../src/utils/whatsapp.js";
import { generateQuoteReference } from "../src/utils/reference.js";

describe("Quote & WhatsApp Deep-link Engine", () => {
  it("should generate a valid reference code formatted as ELP-YYYYMM-XXXXX", () => {
    const ref = generateQuoteReference();
    expect(ref).toMatch(/^ELP-\d{6}-[A-Z0-9]{5}$/);
  });

  it("should generate a valid WhatsApp URL with items, quantities, and customer details", () => {
    const url = buildWhatsAppQuoteUrl({
      reference: "ELP-202610-8A9C2",
      customerName: "Dr. Adebayo",
      hospitalClinic: "Cedarcrest Hospitals",
      location: "Abuja",
      targetPhoneNumber: "+2348012345678",
      items: [
        {
          productName: "HD Laparoscopic 30° Telescope",
          productSku: "ELP-LAP-TEL-3010",
          quantity: 2,
          customRequirement: "Include light cable adapter",
        },
        {
          productName: "Mayo Dissecting Scissors Curved",
          productSku: "ELP-GEN-SCI-MC17",
          quantity: 5,
        },
      ],
      customerNotes: "Urgent delivery needed before Thursday surgery.",
    });

    expect(url).toContain("https://wa.me/2348012345678?text=");
    
    // Decode message to verify formatting
    const encodedText = url.split("text=")[1];
    const decoded = decodeURIComponent(encodedText);

    expect(decoded).toContain("*NEW QUOTE REQUEST — ELPIMA SURGICALS*");
    expect(decoded).toContain("*Reference:* ELP-202610-8A9C2");
    expect(decoded).toContain("*From:* Dr. Adebayo");
    expect(decoded).toContain("*Facility:* Cedarcrest Hospitals");
    expect(decoded).toContain("HD Laparoscopic 30° Telescope");
    expect(decoded).toContain("Qty: *2*");
    expect(decoded).toContain("Include light cable adapter");
    expect(decoded).toContain("Qty: *5*");
    expect(decoded).toContain("Urgent delivery needed before Thursday surgery.");
  });
});
