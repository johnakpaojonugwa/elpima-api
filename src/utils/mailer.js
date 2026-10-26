import { Resend } from "resend";
import { env, isTest, isDev } from "../config/env.js";
import { logger } from "./logger.js";

// Initialize Resend client if API key is provided
export const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

/**
 * Base email layout wrapper with responsive, premium surgical styling
 */
function renderEmailLayout({ title, previewText, bodyContent }) {
  const companyName = env.COMPANY_NAME || "Elpima Surgicals Limited";
  const companyAddress = env.COMPANY_ADDRESS || "Kaduna / Lagos, Nigeria";
  const companyPhone = env.COMPANY_PHONE || "+234 811 894 1799";
  const companyEmail = env.COMPANY_EMAIL || "info@elpimasurgicals.com";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f8fafc;
      padding: 40px 16px;
      box-sizing: border-box;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
      border: 1px solid #e2e8f0;
    }
    .header {
      background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
      padding: 32px 28px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      color: #ffffff;
      font-size: 22px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .header p {
      margin: 6px 0 0;
      color: #93c5fd;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      font-weight: 500;
    }
    .content {
      padding: 36px 32px;
    }
    .content h2 {
      margin: 0 0 16px;
      color: #0f172a;
      font-size: 20px;
      font-weight: 600;
    }
    .content p {
      margin: 0 0 16px;
      line-height: 1.6;
      font-size: 15px;
      color: #334155;
    }
    .btn-container {
      margin: 28px 0;
      text-align: center;
    }
    .btn {
      display: inline-block;
      background-color: #2563eb;
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 600;
      font-size: 15px;
      padding: 12px 28px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
    }
    .alert-box {
      background-color: #eff6ff;
      border-left: 4px solid #3b82f6;
      padding: 14px 18px;
      border-radius: 0 6px 6px 0;
      margin: 20px 0;
      font-size: 14px;
      color: #1e40af;
      line-height: 1.5;
    }
    .warning-box {
      background-color: #fffbeb;
      border-left: 4px solid #f59e0b;
      padding: 14px 18px;
      border-radius: 0 6px 6px 0;
      margin: 20px 0;
      font-size: 13px;
      color: #92400e;
      line-height: 1.5;
    }
    .table-container {
      margin: 20px 0;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 14px;
    }
    th {
      background-color: #f1f5f9;
      color: #475569;
      padding: 10px 14px;
      font-weight: 600;
      border-bottom: 1px solid #e2e8f0;
    }
    td {
      padding: 10px 14px;
      border-bottom: 1px solid #e2e8f0;
      color: #334155;
    }
    tr:last-child td {
      border-bottom: none;
    }
    .footer {
      background-color: #f8fafc;
      padding: 24px 32px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
      font-size: 12px;
      color: #64748b;
      line-height: 1.6;
    }
    .footer a {
      color: #2563eb;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>${companyName}</h1>
        <p>Surgical Equipment & Medical Solutions</p>
      </div>
      <div class="content">
        ${bodyContent}
      </div>
      <div class="footer">
        <p><strong>${companyName}</strong> &bull; ${companyAddress}</p>
        <p>Direct Inquiries: ${companyPhone} | <a href="mailto:${companyEmail}">${companyEmail}</a></p>
        <p style="margin-top: 12px; font-size: 11px; color: #94a3b8;">
          This is an automated operational notification. If you did not expect this communication, please contact support.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Universal email sender utilizing the Resend API with graceful fallbacks
 *
 * @param {object} options
 * @param {string|string[]} options.to - Recipient email(s)
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} [options.text] - Plain text fallback
 * @param {string} [options.replyTo] - Optional reply-to email address
 */
export async function sendEmail({ to, subject, html, text, replyTo }) {
  const fromEmail = env.RESEND_FROM_EMAIL || "Elpima Surgicals <onboarding@resend.dev>";
  const recipients = Array.isArray(to) ? to : [to];

  logger.info(`[Mailer] Dispatching email "${subject}" to ${recipients.join(", ")}`);

  // In test environment, skip network call unless explicitly tested
  if (isTest && !process.env.FORCE_RESEND_IN_TEST) {
    logger.info(`[Mailer:Mock] Test mode active — email sending simulated.`);
    return {
      success: true,
      simulated: true,
      messageId: `mock-${Date.now()}`,
    };
  }

  // If Resend API key is not configured, fall back to console logging
  if (!resend) {
    logger.warn(`[Mailer:Warning] RESEND_API_KEY is not configured. Email logged to console:`);
    logger.info(`To: ${recipients.join(", ")}`);
    logger.info(`Subject: ${subject}`);
    if (text) logger.info(`Body:\n${text}`);
    return {
      success: true,
      simulated: true,
      messageId: `simulated-no-key-${Date.now()}`,
    };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: recipients,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(),
      ...(replyTo ? { reply_to: replyTo } : {}),
    });

    if (error) {
      logger.error(`[Resend:Error] API Error: ${error.message || JSON.stringify(error)}`);
      return {
        success: false,
        error: error.message || error,
      };
    }

    logger.info(`[Resend:Success] Email sent successfully. Resend ID: ${data?.id}`);
    return {
      success: true,
      messageId: data?.id,
    };
  } catch (err) {
    logger.error(`[Resend:Exception] Failed to send email: ${err.message}`);
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Dispatch Password Reset Email
 */
export async function sendPasswordResetEmail({ toEmail, recipientName, resetToken }) {
  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(toEmail)}`;

  const bodyContent = `
    <h2>Password Reset Request</h2>
    <p>Hello ${recipientName || "there"},</p>
    <p>We received a request to reset your password for your <strong>${env.COMPANY_NAME}</strong> administrative account.</p>
    
    <div class="alert-box">
      <strong>Security Notice:</strong> This password reset link is valid for <strong>15 minutes</strong> and can only be used once.
    </div>

    <div class="btn-container">
      <a href="${resetUrl}" class="btn" target="_blank" rel="noopener noreferrer">Reset Your Password</a>
    </div>

    <p style="font-size: 13px; color: #64748b;">
      If the button above does not work, copy and paste this URL into your browser:
      <br>
      <a href="${resetUrl}" style="color: #2563eb; word-break: break-all;">${resetUrl}</a>
    </p>

    <div class="warning-box">
      If you did not request a password reset, please disregard this email or notify the Super-Admin immediately. Your credentials remain safe and untouched.
    </div>
  `;

  const html = renderEmailLayout({
    title: "Reset Your Password — Elpima Surgicals",
    bodyContent,
  });

  const text = `Hello ${recipientName || "there"},\n\nWe received a request to reset your password. Use the following link within 15 minutes:\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`;

  return sendEmail({
    to: toEmail,
    subject: `Password Reset Request — ${env.COMPANY_NAME}`,
    html,
    text,
  });
}

/**
 * Dispatch Quote Inquiry Acknowledgment to Customer
 */
export async function sendQuoteConfirmationEmail({ quote }) {
  if (!quote.customerEmail) return { success: false, reason: "No email provided" };

  const itemsRows = (quote.items || [])
    .map(
      (item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td><strong>${item.productName}</strong> ${item.productSku ? `<br><span style="font-size: 12px; color: #64748b;">SKU: ${item.productSku}</span>` : ""}</td>
        <td style="text-align: center;">${item.quantity}</td>
        <td>${item.customRequirement || "Standard Specification"}</td>
      </tr>
    `
    )
    .join("");

  const bodyContent = `
    <h2>Quote Inquiry Received</h2>
    <p>Dear ${quote.customerName},</p>
    <p>Thank you for reaching out to <strong>${env.COMPANY_NAME}</strong>. We have received your Request for Quotation (RFQ) and our clinical sales team is reviewing your requirements.</p>
    
    <div class="alert-box">
      <strong>Quote Reference:</strong> <span style="font-family: monospace; font-size: 15px; font-weight: bold;">${quote.reference}</span><br>
      <strong>Priority:</strong> ${quote.priority || "STANDARD"} &bull; <strong>Clinic/Hospital:</strong> ${quote.hospitalClinic || "Private Practice"}
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th style="width: 30px;">#</th>
            <th>Item & Specifications</th>
            <th style="width: 50px; text-align: center;">Qty</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows || "<tr><td colspan='4'>No item details attached</td></tr>"}
        </tbody>
      </table>
    </div>

    ${quote.whatsappLink ? `
      <div class="btn-container">
        <a href="${quote.whatsappLink}" class="btn" style="background-color: #22c55e;" target="_blank" rel="noopener noreferrer">
          Chat Directly on WhatsApp
        </a>
      </div>
    ` : ""}

    <p style="font-size: 14px; color: #475569;">
      Our clinical sales desk will reach out via WhatsApp or phone (<strong>${quote.customerPhone}</strong>) with official availability and formal pricing.
    </p>
  `;

  const html = renderEmailLayout({
    title: `Quotation Received — Ref: ${quote.reference}`,
    bodyContent,
  });

  return sendEmail({
    to: quote.customerEmail,
    subject: `Quote Inquiry Confirmation [Ref: ${quote.reference}] — ${env.COMPANY_NAME}`,
    html,
  });
}

/**
 * Dispatch New Manager Welcome & Invitation Email
 */
export async function sendManagerInviteEmail({ toEmail, recipientName, temporaryPassword, role }) {
  const loginUrl = `${env.FRONTEND_URL}/admin/login`;

  const bodyContent = `
    <h2>Welcome to the ${env.COMPANY_NAME} Management Portal</h2>
    <p>Hello ${recipientName},</p>
    <p>An administrative account has been created for you with the role of <strong>${role}</strong>.</p>

    <div class="alert-box">
      <strong>Your Account Credentials:</strong><br>
      <strong>Portal URL:</strong> <a href="${loginUrl}">${loginUrl}</a><br>
      <strong>Email:</strong> ${toEmail}<br>
      <strong>Temporary Password:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-size: 14px;">${temporaryPassword}</code>
    </div>

    <div class="warning-box">
      <strong>Mandatory Security Actions:</strong><br>
      1. Log in and immediately change your temporary password.<br>
      2. Configure <strong>Two-Factor Authentication (2FA)</strong> using an Authenticator App (Google Authenticator, Microsoft Authenticator, or 1Password) from your account security dashboard.
    </div>

    <div class="btn-container">
      <a href="${loginUrl}" class="btn" target="_blank" rel="noopener noreferrer">Access Admin Portal</a>
    </div>
  `;

  const html = renderEmailLayout({
    title: `Your ${env.COMPANY_NAME} Portal Credentials`,
    bodyContent,
  });

  return sendEmail({
    to: toEmail,
    subject: `Welcome to ${env.COMPANY_NAME} — Administrative Credentials`,
    html,
  });
}

/**
 * Dispatch 2FA Security Alert
 */
export async function sendTwoFactorSecurityAlert({ toEmail, recipientName, action }) {
  const actionText = {
    ENABLED: "Two-Factor Authentication has been successfully enabled on your account.",
    DISABLED: "Warning: Two-Factor Authentication has been disabled on your account.",
    BACKUP_REGENERATED: "Your two-factor emergency backup codes were newly regenerated.",
  }[action] || `Your two-factor authentication settings were updated (${action}).`;

  const isWarning = action === "DISABLED";

  const bodyContent = `
    <h2>Security Alert: 2FA Settings Changed</h2>
    <p>Hello ${recipientName || "there"},</p>
    <p>${actionText}</p>

    <div class="${isWarning ? "warning-box" : "alert-box"}">
      <strong>Timestamp:</strong> ${new Date().toUTCString()}<br>
      <strong>Status:</strong> ${action}
    </div>

    <p style="font-size: 14px; color: #475569;">
      If you authorized this change, no further action is needed. If you did NOT make this change, please contact the Super-Admin immediately to protect your account.
    </p>
  `;

  const html = renderEmailLayout({
    title: `Security Alert: 2FA Updated — ${env.COMPANY_NAME}`,
    bodyContent,
  });

  return sendEmail({
    to: toEmail,
    subject: `Security Alert: 2FA Settings Changed — ${env.COMPANY_NAME}`,
    html,
  });
}
