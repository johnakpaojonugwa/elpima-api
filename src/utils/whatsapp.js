import { env } from "../config/env.js";

/**
 * Format a WhatsApp deep link URL for a quote inquiry
 *
 * @param {object} params
 * @param {string} params.reference - Quote reference code
 * @param {string} params.customerName - Doctor/Procurement officer name
 * @param {string} [params.hospitalClinic] - Hospital or clinic name
 * @param {string} [params.location] - City / State
 * @param {Array<{productName: string, productSku?: string, quantity: number, customRequirement?: string}>} params.items
 * @param {string} [params.customerNotes]
 * @param {string} [params.targetPhoneNumber]
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

  items.forEach((item, index) => {
    const skuText = item.productSku ? ` [SKU: ${item.productSku}]` : "";
    const reqText = item.customRequirement ? ` _(${item.customRequirement})_` : "";
    lines.push(`${index + 1}. *${item.productName}*${skuText} — Qty: *${item.quantity}*${reqText}`);
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
