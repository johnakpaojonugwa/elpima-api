import { Queue, Worker } from "bullmq";
import { env, isTest } from "../config/env.js";
import { logger } from "../utils/logger.js";
import {
  sendPasswordResetEmail,
  sendQuoteConfirmationEmail,
  sendManagerInviteEmail,
  sendTwoFactorSecurityAlert,
} from "../utils/mailer.js";

const QUEUE_NAME = "email-queue";

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 3000, // 3s, 6s, 12s
  },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 500 },
};

let emailQueue = null;
let emailWorker = null;

// Initialize BullMQ Queue & Worker if REDIS_URL is provided and not in unit test mode
if (env.REDIS_URL && !isTest) {
  try {
    const connection = {
      url: env.REDIS_URL,
      maxRetriesPerRequest: null,
    };

    emailQueue = new Queue(QUEUE_NAME, {
      connection,
      defaultJobOptions,
    });

    emailWorker = new Worker(
      QUEUE_NAME,
      async (job) => {
        logger.info(`[BullMQ:EmailWorker] Processing job ${job.id} (${job.name})`);

        switch (job.name) {
          case "password-reset":
            return sendPasswordResetEmail(job.data);
          case "quote-confirmation":
            return sendQuoteConfirmationEmail(job.data);
          case "manager-invite":
            return sendManagerInviteEmail(job.data);
          case "2fa-security-alert":
            return sendTwoFactorSecurityAlert(job.data);
          default:
            logger.warn(`[BullMQ:EmailWorker] Unknown job name: ${job.name}`);
        }
      },
      { connection, concurrency: 5 }
    );

    emailWorker.on("completed", (job) => {
      logger.info(`[BullMQ:EmailWorker] Job ${job.id} (${job.name}) completed successfully`);
    });

    emailWorker.on("failed", (job, error) => {
      logger.error(`[BullMQ:EmailWorker] Job ${job?.id} (${job?.name}) failed: ${error.message}`, {
        attemptsMade: job?.attemptsMade,
      });
    });
  } catch (error) {
    logger.warn(`[BullMQ:EmailWorker] Failed to initialize Redis queue: ${error.message}. Using direct fallback.`);
    emailQueue = null;
    emailWorker = null;
  }
}

/**
 * Dispatch or Queue Password Reset Email
 */
export async function queuePasswordResetEmail(data) {
  if (emailQueue) {
    return emailQueue.add("password-reset", data);
  }
  // Seamless fallback for local dev or tests without Redis
  return sendPasswordResetEmail(data);
}

/**
 * Dispatch or Queue Quote Confirmation Email
 */
export async function queueQuoteConfirmationEmail(data) {
  if (emailQueue) {
    return emailQueue.add("quote-confirmation", data);
  }
  return sendQuoteConfirmationEmail(data);
}

/**
 * Dispatch or Queue Manager Invitation Email
 */
export async function queueManagerInviteEmail(data) {
  if (emailQueue) {
    return emailQueue.add("manager-invite", data);
  }
  return sendManagerInviteEmail(data);
}

/**
 * Dispatch or Queue 2FA Security Alert
 */
export async function queueTwoFactorSecurityAlert(data) {
  if (emailQueue) {
    return emailQueue.add("2fa-security-alert", data);
  }
  return sendTwoFactorSecurityAlert(data);
}

/**
 * Graceful shutdown helper
 */
export async function closeEmailQueue() {
  if (emailWorker) await emailWorker.close();
  if (emailQueue) await emailQueue.close();
}
