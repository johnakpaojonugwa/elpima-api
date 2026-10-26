import "dotenv/config";
import { env } from "./src/config/env.js";
import { createApp } from "./src/app.js";
import { connectDb, disconnectDb } from "./src/config/prisma.js";
import { shutdownQueues } from "./src/queues/index.js";
import { logger } from "./src/utils/logger.js";

async function bootstrap() {
  await connectDb();

  const app = createApp();

  const server = app.listen(env.PORT, () => {
    logger.info(`Elpima API server running on port ${env.PORT} [${env.NODE_ENV}]`);
    logger.info(`Interactive API Docs available at http://localhost:${env.PORT}/api/v1/docs`);
  });

  // Slowloris & DoS connection timeout protection
  server.keepAliveTimeout = 5_000;
  server.headersTimeout = 20_000;
  server.requestTimeout = 30_000;

  const shutdown = (signal) => {
    logger.info(`${signal} received, beginning graceful shutdown...`);

    const forceTimer = setTimeout(() => {
      logger.warn("Forced shutdown after 10s timeout");
      process.exit(1);
    }, 10_000);
    forceTimer.unref();

    server.close(async () => {
      clearTimeout(forceTimer);
      await shutdownQueues();
      await disconnectDb();
      logger.info("Server closed gracefully. Exiting process.");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

bootstrap().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
