import { describe, it, expect } from "vitest";
import { generateQuotePdf } from "../src/utils/pdfGenerator.js";

describe("PDF Proforma Quotation Engine", () => {
  it("should stream a valid PDF document for a quote inquiry", async () => {
    const mockQuote = {
      reference: "ELP-202610-TEST1",
      customerName: "Dr. Danladi",
      hospitalClinic: "Barau Dikko Teaching Hospital",
      location: "Kaduna",
      customerPhone: "+2348118941799",
      priority: "URGENT",
      createdAt: new Date(),
      customerNotes: "Requires expedited shipping for scheduled laparoscopy.",
      items: [
        {
          productName: "HD Laparoscopic 30° Rigid Telescope (10mm)",
          productSku: "ELP-LAP-TEL-3010",
          quantity: 2,
          customRequirement: "Include sapphire light cable",
        },
      ],
    };

    const doc = generateQuotePdf(mockQuote, {
      companyName: "Elpima Surgicals Limited",
      companyAddress: "Kaduna, Nigeria",
      companyPhone: "+2348118941799",
      companyEmail: "info@elpimasurgicals.com",
    });

    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));

    await new Promise((resolve, reject) => {
      doc.on("end", resolve);
      doc.on("error", reject);
      doc.end();
    });

    const pdfBuffer = Buffer.concat(chunks);
    expect(pdfBuffer.length).toBeGreaterThan(1000);
    // PDF Magic bytes check: %PDF-
    expect(pdfBuffer.toString("utf8", 0, 5)).toBe("%PDF-");
  });
});
