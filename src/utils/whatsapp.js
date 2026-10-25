import { env } from "../config/env.js";

/**
 * Format a WhatsApp deep link URL for a quote inquiry
 *
 * @param {object} quoteParameters
 * @param {string} quoteParameters.reference - Quote reference code
 * @param {string} quoteParameters.customerName - Doctor/Procurement officer name
 * @param {string} [quoteParameters.hospitalClinic] - Hospital or clinic name
 * @param {string} [quoteParameters.location] - City / State
 * @param {Array<{productName: string, productSku?: string, quantity: number, customRequirement?: string}>} quoteParameters.items
 * @param {string} [quoteParameters.customerNotes]
 * @param {string} [quoteParameters.targetPhoneNumber]
 * @returns {string} WhatsApp direct link
 */
export function buildWhatsAppQuoteUrl({
  reference,
  customerName,
  hospitalClinic,
  location,
  items = [],
  customerNotes,
  targetPhoneNumber,
}) {
  const phone = (targetPhoneNumber || env.DEFAULT_WHATSAPP_NUMBER).replace(/[^0-9]/g, "");

  const lines = [
    `*NEW QUOTE REQUEST — ELPIMA SURGICALS*`,
    `*Reference:* ${reference}`,
    `*From:* ${customerName}`,
  ];

  if (hospitalClinic) {
    lines.push(`*Facility:* ${hospitalClinic}`);
  }
  if (location) {
    lines.push(`*Location:* ${location}`);
  }

  lines.push(``);
  lines.push(`*Requested Equipment / Items:*`);

  items.forEach((quoteItem, itemIndex) => {
    const skuText = quoteItem.productSku ? ` [SKU: ${quoteItem.productSku}]` : "";
    const requirementText = quoteItem.customRequirement ? ` _(${quoteItem.customRequirement})_` : "";
    lines.push(`${itemIndex + 1}. *${quoteItem.productName}*${skuText} — Qty: *${quoteItem.quantity}*${requirementText}`);
  });

  if (customerNotes && customerNotes.trim()) {
    lines.push(``);
    lines.push(`*Special Notes:* ${customerNotes.trim()}`);
  }

  lines.push(``);
  lines.push(`_Sent via Elpima Surgicals Online Catalog_`);

  const messageText = lines.join("\n");
  const encodedMessage = encodeURIComponent(messageText);

  return `https://wa.me/${phone}?text=${encodedMessage}`;
}
