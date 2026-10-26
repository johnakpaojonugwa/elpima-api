import { logger } from "./logger.js";
import { env, isDev, isTest } from "../config/env.js";

/**
 * Dispatch password reset email
 * Works out-of-the-box with clean console logging in dev/test,
 * and is ready for plug-and-play transactional email providers (Resend, SendGrid, SMTP).
 */
export async function sendPasswordResetEmail({ toEmail, recipientName, resetToken }) {
  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(toEmail)}`;

  logger.info(`[Mailer] Password reset requested for: ${toEmail}`);

  if (isDev || isTest) {
    logger.info(`--------------------------------------------------`);
    logger.info(`[DEV PASSWORD RESET LINK]`);
    logger.info(`Recipient: ${recipientName} <${toEmail}>`);
    logger.info(`Reset URL: ${resetUrl}`);
    logger.info(`Expires in: 1 hour`);
    logger.info(`--------------------------------------------------`);
  }

  // Future / Production email dispatch hook (e.g. Resend / SMTP / Webhook)
  // Can be extended with process.env.RESEND_API_KEY or SMTP transport when configured.

  return {
    success: true,
    toEmail,
    resetUrl,
  };
}
