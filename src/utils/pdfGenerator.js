import PDFDocument from "pdfkit";

/**
 * Generate official Elpima Surgicals PDF Proforma Quotation
 * @param {object} quote - Full quote record with items
 * @param {object} settings - Store settings (company name, phone, email, address)
 * @returns {PDFKit.PDFDocument} - Streaming PDFDocument instance
 */
export function generateQuotePdf(quote, settings = {}) {
  const pdfDocument = new PDFDocument({
    margin: 40,
    size: "A4",
    info: {
      Title: `Quotation_${quote.reference}`,
      Author: settings.companyName || "Elpima Surgicals Limited",
      Subject: "Official Surgical Equipment Proforma Quotation",
    },
  });

  const primaryColor = "#0F3A5D"; // Deep Medical Navy
  const secondaryColor = "#0A6E82"; // Surgical Teal
  const darkGray = "#333333";
  const lightGray = "#777777";
  const tableHeaderBg = "#EBF2F7";

  // 1. Company Header
  pdfDocument
    .fillColor(primaryColor)
    .fontSize(18)
    .font("Helvetica-Bold")
    .text(settings.companyName || "ELPIMA SURGICALS LIMITED", 40, 40)
    .fontSize(8)
    .font("Helvetica")
    .fillColor(darkGray)
    .text("RC-1849204 | Medical & Surgical Equipment Importers & Distributors", 40, 62)
    .text(
      `${settings.companyAddress || "Kaduna, Nigeria"} | Tel: ${settings.companyPhone || "+2348118941799"} | Email: ${settings.companyEmail || "info@elpimasurgicals.com"}`,
      40,
      74
    );

  // Horizontal Rule
  pdfDocument
    .strokeColor("#D1D9E0")
    .lineWidth(1)
    .moveTo(40, 90)
    .lineTo(555, 90)
    .stroke();

  // 2. Document Title
  pdfDocument
    .fillColor(secondaryColor)
    .fontSize(14)
    .font("Helvetica-Bold")
    .text("OFFICIAL PROFORMA QUOTATION", 40, 105);

  // 3. Metadata Blocks (Left: Customer, Right: Quotation Details)
  const metaTop = 130;

  // Left: Bill To
  pdfDocument
    .fillColor(primaryColor)
    .fontSize(10)
    .font("Helvetica-Bold")
    .text("QUOTED TO / FACILITY:", 40, metaTop)
    .font("Helvetica")
    .fillColor(darkGray)
    .text(quote.customerName || "Healthcare Provider", 40, metaTop + 15)
    .text(quote.hospitalClinic || "Hospital / Medical Center", 40, metaTop + 27)
    .text(quote.location || "Nigeria", 40, metaTop + 39)
    .text(`WhatsApp: ${quote.customerPhone}`, 40, metaTop + 51);

  // Right: Quote Reference & Date
  const dateStr = new Date(quote.createdAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  pdfDocument
    .fillColor(primaryColor)
    .fontSize(10)
    .font("Helvetica-Bold")
    .text("QUOTATION DETAILS:", 360, metaTop)
    .font("Helvetica")
    .fillColor(darkGray)
    .text(`Reference: ${quote.reference}`, 360, metaTop + 15)
    .text(`Date Issued: ${dateStr}`, 360, metaTop + 27)
    .text(`Validity: 14 Days from issuance`, 360, metaTop + 39)
    .text(`Priority: ${quote.priority || "STANDARD"}`, 360, metaTop + 51);

  // 4. Items Table
  let tableTop = 205;

  // Table Header Background
  pdfDocument
    .rect(40, tableTop, 515, 22)
    .fill(tableHeaderBg);

  pdfDocument
    .fillColor(primaryColor)
    .fontSize(9)
    .font("Helvetica-Bold")
    .text("#", 45, tableTop + 6)
    .text("Surgical Equipment / Specification", 70, tableTop + 6)
    .text("SKU", 330, tableTop + 6)
    .text("Qty", 420, tableTop + 6)
    .text("Pricing Terms", 470, tableTop + 6);

  tableTop += 25;

  // Table Rows
  quote.items.forEach((quoteItem, itemIndex) => {
    // Alternating background for rows
    if (itemIndex % 2 === 1) {
      pdfDocument.rect(40, tableTop - 3, 515, 20).fill("#F9FBFC");
    }

    pdfDocument
      .fillColor(darkGray)
      .fontSize(8.5)
      .font("Helvetica")
      .text(String(itemIndex + 1), 45, tableTop + 2)
      .font("Helvetica-Bold")
      .text(quoteItem.productName, 70, tableTop + 2, { width: 250, ellipsis: true })
      .font("Helvetica")
      .text(quoteItem.productSku || "ELP-STD", 330, tableTop + 2)
      .text(String(quoteItem.quantity), 420, tableTop + 2)
      .text("Price on Request", 470, tableTop + 2);

    if (quoteItem.customRequirement) {
      tableTop += 14;
      pdfDocument
        .fontSize(7.5)
        .fillColor(lightGray)
        .text(`Note: ${quoteItem.customRequirement}`, 70, tableTop, { width: 440 });
    }

    tableTop += 18;
  });

  // Table bottom border
  pdfDocument
    .strokeColor("#D1D9E0")
    .lineWidth(0.5)
    .moveTo(40, tableTop + 5)
    .lineTo(555, tableTop + 5)
    .stroke();

  tableTop += 18;

  // 5. Customer Notes (if any)
  if (quote.customerNotes) {
    pdfDocument
      .fillColor(primaryColor)
      .fontSize(9)
      .font("Helvetica-Bold")
      .text("Clinical / Procurement Notes:", 40, tableTop)
      .fontSize(8)
      .font("Helvetica")
      .fillColor(darkGray)
      .text(quote.customerNotes, 40, tableTop + 14, { width: 515 });

    tableTop += 40;
  }

  // 6. Terms, Warranty & Bank Transfer Notice
  const disclaimerTop = Math.max(tableTop + 15, 580);

  pdfDocument
    .rect(40, disclaimerTop, 515, 75)
    .fill("#F5F8FA");

  pdfDocument
    .fillColor(primaryColor)
    .fontSize(8.5)
    .font("Helvetica-Bold")
    .text("STANDARD SUPPLY TERMS & REGULATORY COMPLIANCE:", 48, disclaimerTop + 8)
    .fontSize(7.5)
    .font("Helvetica")
    .fillColor(darkGray)
    .text(
      "1. All surgical instruments and endoscopic gear are manufactured under ISO 13485 and CE certified standards.",
      48,
      disclaimerTop + 22
    )
    .text(
      "2. Quotation is valid for 14 calendar days from date of issuance subject to foreign exchange rate stability.",
      48,
      disclaimerTop + 33
    )
    .text(
      "3. Dispatched items undergo pre-shipment sterile packaging inspection. Autoclavable up to 134°C.",
      48,
      disclaimerTop + 44
    )
    .text(
      "4. Official settlement: Direct wire transfer to Elpima Surgicals Limited corporate accounts upon formal invoice confirmation.",
      48,
      disclaimerTop + 55
    );

  // 7. Signature & Stamp Block
  pdfDocument
    .fillColor(primaryColor)
    .fontSize(8.5)
    .font("Helvetica-Bold")
    .text("FOR: ELPIMA SURGICALS LIMITED", 380, disclaimerTop + 100)
    .strokeColor(primaryColor)
    .lineWidth(1)
    .moveTo(380, disclaimerTop + 140)
    .lineTo(540, disclaimerTop + 140)
    .stroke()
    .fillColor(darkGray)
    .fontSize(7.5)
    .font("Helvetica")
    .text("Authorized Signature & Stamp", 400, disclaimerTop + 145);

  return pdfDocument;
}
