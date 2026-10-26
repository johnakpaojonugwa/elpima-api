import { Queue, Worker } from "bullmq";
import { env, isTest } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { notifySalesDesk } from "../utils/notifications.js";

const QUEUE_NAME = "notification-queue";

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 5000, // 5s, 10s, 20s
  },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 500 },
};

let notificationQueue = null;
let notificationWorker = null;

if (env.REDIS_URL && !isTest) {
  try {
    const connection = {
      url: env.REDIS_URL,
      maxRetriesPerRequest: null,
    };

    notificationQueue = new Queue(QUEUE_NAME, {
      connection,
      defaultJobOptions,
    });

    notificationWorker = new Worker(
      QUEUE_NAME,
      async (job) => {
        logger.info(`[BullMQ:NotificationWorker] Processing job ${job.id} (${job.name})`);

        if (job.name === "sales-desk-webhook") {
          return notifySalesDesk(job.data);
        }
      },
      { connection, concurrency: 5 }
    );

    notificationWorker.on("completed", (job) => {
      logger.info(`[BullMQ:NotificationWorker] Job ${job.id} (${job.name}) completed successfully`);
    });

    notificationWorker.on("failed", (job, err) => {
      logger.error(`[BullMQ:NotificationWorker] Job ${job?.id} (${job?.name}) failed: ${err.message}`, {
        attemptsMade: job?.attemptsMade,
      });
    });
  } catch (err) {
    logger.warn(`[BullMQ:NotificationWorker] Failed to initialize Redis queue: ${err.message}. Using direct fallback.`);
    notificationQueue = null;
    notificationWorker = null;
  }
}

/**
 * Enqueue Sales Desk Webhook notification with automated retries
 */
export async function queueSalesDeskNotification(quote) {
  if (notificationQueue) {
    return notificationQueue.add("sales-desk-webhook", quote);
  }
  return notifySalesDesk(quote);
}

export async function closeNotificationQueue() {
  if (notificationWorker) await notificationWorker.close();
  if (notificationQueue) await notificationQueue.close();
}
