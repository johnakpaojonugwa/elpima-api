import { closeEmailQueue } from "./email.queue.js";
import { closeNotificationQueue } from "./notification.queue.js";
import { closeRedis } from "../config/redis.js";
import { logger } from "../utils/logger.js";

export * from "./email.queue.js";
export * from "./notification.queue.js";

/**
 * Gracefully drain and close all BullMQ background workers and queues
 */
export async function shutdownQueues() {
  logger.info("[BullMQ] Closing background workers and queues...");
  await Promise.allSettled([
    closeEmailQueue(),
    closeNotificationQueue(),
    closeRedis(),
  ]);
  logger.info("[BullMQ] Background workers drained and shut down cleanly.");
}
