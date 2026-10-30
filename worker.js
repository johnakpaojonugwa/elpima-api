import "dotenv/config";
import { connectDb, disconnectDb } from "./src/config/prisma.js";
import { shutdownQueues } from "./src/queues/index.js";
import { logger } from "./src/utils/logger.js";
import { env } from "./src/config/env.js";

async function startWorker() {
  logger.info(`[Worker] Starting dedicated BullMQ background worker in ${env.NODE_ENV} mode...`);

  await connectDb();

  // Dynamically load queues and their workers
  await import("./src/queues/index.js");

  logger.info("[Worker] Background worker process active and listening for jobs (Email, Notifications, Webhooks).");

  const shutdown = async (signal) => {
    logger.info(`[Worker] ${signal} received, beginning graceful shutdown...`);

    const forceTimer = setTimeout(() => {
      logger.warn("[Worker] Forced shutdown after 10s timeout");
      process.exit(1);
    }, 10_000);
    forceTimer.unref();

    try {
      await shutdownQueues();
      await disconnectDb();
      clearTimeout(forceTimer);
      logger.info("[Worker] Background worker shut down cleanly. Exiting process.");
      process.exit(0);
    } catch (error) {
      logger.error(`[Worker] Error during shutdown: ${error.message}`);
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

startWorker().catch((error) => {
  logger.error("[Worker] Fatal error starting worker process:", error);
  process.exit(1);
});
