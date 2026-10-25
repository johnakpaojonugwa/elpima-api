import { logger } from "./logger.js";
import { env } from "../config/env.js";

/**
 * Dispatch real-time alert to Elpima sales desk when an RFQ is submitted
 * Works asynchronously so network latency to external webhooks never slows down customer response
 *
 * @param {object} quote - Created quote inquiry object with items
 */
export async function notifySalesDesk(quote) {
  const webhookUrl = env.SALES_DESK_WEBHOOK_URL;
  if (!webhookUrl) {
    logger.info(`[Notification] New quote registered: ${quote.reference} (Sales desk webhook not configured)`);
    return;
  }

  const itemsSummary = quote.items
    ?.map((quoteItem, itemIndex) => `${itemIndex + 1}. ${quoteItem.productName} (x${quoteItem.quantity})`)
    .join("\n") || "No items attached";

  const payload = {
    event: "quote_inquiry.created",
    timestamp: new Date().toISOString(),
    quote: {
      reference: quote.reference,
      customerName: quote.customerName,
      customerPhone: quote.customerPhone,
      customerEmail: quote.customerEmail,
      hospitalClinic: quote.hospitalClinic,
      location: quote.location,
      priority: quote.priority,
      customerNotes: quote.customerNotes,
      items: quote.items,
    },
    message: `🚨 *NEW SURGICAL RFQ — ELPIMA*\n*Ref:* ${quote.reference}\n*From:* ${quote.customerName} (${quote.hospitalClinic || "Clinic"}, ${quote.location || "Nigeria"})\n*Phone:* ${quote.customerPhone}\n\n*Items:*\n${itemsSummary}`,
  };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000), // 5s timeout
    });

    if (!response.ok) {
      logger.warn(`[Notification] Webhook returned status ${response.status} for quote ${quote.reference}`);
    } else {
      logger.info(`[Notification] Sales desk notified successfully for quote ${quote.reference}`);
    }
  } catch (error) {
    // Fail-safe: never throw or block the customer's request if notification service fails
    logger.error(`[Notification] Failed to dispatch sales desk webhook: ${error.message}`);
  }
}
