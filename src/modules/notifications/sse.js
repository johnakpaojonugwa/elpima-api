import { EventEmitter } from "node:events";
import { Redis } from "ioredis";
import { env, isTest } from "../../config/env.js";
import { getRedisClient, isRedisReady } from "../../config/redis.js";
import { logger } from "../../utils/logger.js";

const NOTIFICATION_CHANNEL = "elpima:notifications:broadcast";

// Local in-memory event bus (used in test mode or if Redis is unavailable)
const localEventBus = new EventEmitter();
localEventBus.setMaxListeners(200);

// Active SSE client connections: Map<string, { res: Response, user: object, timer: NodeJS.Timeout }>
const clients = new Map();

let redisSubscriber = null;

/**
 * Initialize Redis Pub/Sub subscriber
 */
export function initNotificationSubscriber() {
  if (redisSubscriber || isTest || !env.REDIS_URL) {
    return;
  }

  try {
    redisSubscriber = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy: (times) => {
        if (times > 5) return null;
        return Math.min(times * 500, 2000);
      },
    });

    redisSubscriber.on("connect", () => {
      logger.info("[SSE:Redis] Subscriber connected to Redis");
    });

    redisSubscriber.on("ready", async () => {
      try {
        await redisSubscriber.subscribe(NOTIFICATION_CHANNEL);
        logger.info(`[SSE:Redis] Subscribed to ${NOTIFICATION_CHANNEL}`);
      } catch (err) {
        logger.error(`[SSE:Redis] Failed to subscribe: ${err.message}`);
      }
    });

    redisSubscriber.on("message", (_channel, message) => {
      try {
        const payload = JSON.parse(message);
        dispatchToClients(payload);
      } catch (err) {
        logger.warn(`[SSE:Redis] Error parsing received broadcast: ${err.message}`);
      }
    });

    redisSubscriber.on("error", (err) => {
      logger.warn(`[SSE:Redis] Subscriber connection warning: ${err.message}`);
    });
  } catch (err) {
    logger.warn(`[SSE:Redis] Subscriber initialization failed: ${err.message}`);
    redisSubscriber = null;
  }
}

/**
 * Dispatch notification event to active SSE clients
 */
function dispatchToClients(payload) {
  const data = JSON.stringify(payload);

  for (const [connectionId, client] of clients.entries()) {
    try {
      // If notification is targeted to a specific user, only send if matches
      if (payload.userId && payload.userId !== client.user?.id) {
        continue;
      }
      client.res.write(`event: notification\ndata: ${data}\n\n`);
    } catch (err) {
      logger.warn(`[SSE] Failed writing to client ${connectionId}: ${err.message}`);
      removeClient(connectionId);
    }
  }
}

// Local event bus listener for non-Redis / fallback environments
localEventBus.on("broadcast", (payload) => {
  dispatchToClients(payload);
});

/**
 * Publish notification event to Redis and local bus
 */
export async function broadcastNotification(notification) {
  const serialized = JSON.stringify(notification);

  // Dispatch via local event bus
  localEventBus.emit("broadcast", notification);

  // Publish to Redis if connected
  const redisPublisher = getRedisClient();
  if (isRedisReady() && redisPublisher) {
    try {
      await redisPublisher.publish(NOTIFICATION_CHANNEL, serialized);
    } catch (err) {
      logger.warn(`[SSE:Redis] Failed to publish notification to channel: ${err.message}`);
    }
  }
}

/**
 * Register SSE connection for an authenticated client
 */
export function handleSSEConnection(request, response) {
  const user = request.user;
  const connectionId = `${user.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  // Set headers required for Server-Sent Events
  response.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no", // Bypass reverse-proxy (Nginx/Render) buffering
  });

  if (typeof response.flushHeaders === "function") {
    response.flushHeaders();
  }

  // Initial connection handshake
  response.write(`event: connected\ndata: ${JSON.stringify({
    status: "connected",
    userId: user.id,
    timestamp: new Date().toISOString(),
  })}\n\n`);

  // Heartbeat ping every 25s to keep connection open across firewalls/proxies
  const heartbeatTimer = setInterval(() => {
    try {
      response.write(": keepalive\n\n");
    } catch {
      removeClient(connectionId);
    }
  }, 25_000);

  if (heartbeatTimer.unref) {
    heartbeatTimer.unref();
  }

  clients.set(connectionId, {
    res: response,
    user,
    timer: heartbeatTimer,
  });

  logger.info(`[SSE] Client connected: ${connectionId} (User: ${user.fullName || user.id}, Total: ${clients.size})`);

  // Cleanup on connection close
  request.on("close", () => {
    removeClient(connectionId);
  });
}

function removeClient(connectionId) {
  const client = clients.get(connectionId);
  if (client) {
    clearInterval(client.timer);
    clients.delete(connectionId);
    logger.info(`[SSE] Client disconnected: ${connectionId} (Remaining: ${clients.size})`);
  }
}

/**
 * Get count of active SSE client connections
 */
export function getActiveSSEConnectionsCount() {
  return clients.size;
}

/**
 * Gracefully close all SSE connections and subscriber
 */
export async function closeSSE() {
  for (const [connectionId, client] of clients.entries()) {
    clearInterval(client.timer);
    try {
      client.res.end();
    } catch {}
    clients.delete(connectionId);
  }

  if (redisSubscriber) {
    try {
      await redisSubscriber.quit();
    } catch (err) {
      logger.warn(`[SSE:Redis] Error closing subscriber: ${err.message}`);
    }
    redisSubscriber = null;
  }
}

