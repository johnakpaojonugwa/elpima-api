import { Redis } from "ioredis";
import { env, isTest } from "./env.js";
import { logger } from "../utils/logger.js";

let redisClient = null;
let redisConnectionOptions = null;
let isRedisConnected = false;

// Bounded in-memory fallback cache when Redis is unavailable or in test mode
const MAX_MEMORY_CACHE_ITEMS = 500;
const memoryCache = new Map();

// Periodic expired entries sweeper to avoid memory retention (unref'd so it doesn't block process exit)
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, value] of memoryCache.entries()) {
    if (value.expiresAt && value.expiresAt < now) {
      memoryCache.delete(key);
    }
  }
}, 60 * 1000);
if (cleanupTimer.unref) {
  cleanupTimer.unref();
}

if (env.REDIS_URL && !isTest) {
  try {
    redisConnectionOptions = {
      maxRetriesPerRequest: null, // Required by BullMQ
      enableReadyCheck: false,
      retryStrategy: (times) => {
        if (times > 5) {
          logger.warn("[Redis] Maximum reconnection attempts reached. Continuing with in-memory fallback.");
          return null; // Stop reconnecting after 5 tries
        }
        return Math.min(times * 500, 2000);
      },
    };

    redisClient = new Redis(env.REDIS_URL, redisConnectionOptions);

    redisClient.on("connect", () => {
      isRedisConnected = true;
      logger.info("[Redis] Connection established successfully");
    });

    redisClient.on("ready", () => {
      isRedisConnected = true;
      logger.info("[Redis] Client ready for commands");
    });

    redisClient.on("error", (error) => {
      isRedisConnected = false;
      logger.warn(`[Redis] Connection warning: ${error.message}`);
    });

    redisClient.on("close", () => {
      isRedisConnected = false;
    });
  } catch (error) {
    logger.warn(`[Redis] Initialization warning: ${error.message}. Using in-memory fallback.`);
    redisClient = null;
  }
}

/**
 * Return raw Redis client instance if initialized
 */
export function getRedisClient() {
  return redisClient;
}

/**
 * Get the active IORedis connection options for BullMQ
 */
export function getRedisOptions() {
  if (env.REDIS_URL && isRedisConnected) {
    return {
      url: env.REDIS_URL,
      maxRetriesPerRequest: null,
    };
  }
  return null;
}

export function isRedisReady() {
  return isRedisConnected && redisClient?.status === "ready";
}

export async function closeRedis() {
  if (redisClient) {
    try {
      await redisClient.quit();
      logger.info("[Redis] Connection closed gracefully");
    } catch (error) {
      logger.warn(`[Redis] Error closing connection: ${error.message}`);
    }
  }
}

/**
 * Universal Cache Interface (Redis with In-Memory TTL Fallback)
 */
export async function cacheGet(key) {
  if (isRedisReady()) {
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.warn(`[Cache] Redis GET error for ${key}: ${error.message}`);
    }
  }

  // In-Memory Fallback
  const cached = memoryCache.get(key);
  if (cached) {
    if (cached.expiresAt && cached.expiresAt < Date.now()) {
      memoryCache.delete(key);
      return null;
    }
    return cached.data;
  }
  return null;
}

export async function cacheSet(key, value, ttlSeconds = 300) {
  const serialized = JSON.stringify(value);

  if (isRedisReady()) {
    try {
      await redisClient.set(key, serialized, "EX", ttlSeconds);
      return true;
    } catch (error) {
      logger.warn(`[Cache] Redis SET error for ${key}: ${error.message}`);
    }
  }

  // In-Memory Fallback with bounded capacity
  if (memoryCache.size >= MAX_MEMORY_CACHE_ITEMS) {
    const oldestKey = memoryCache.keys().next().value;
    if (oldestKey) {
      memoryCache.delete(oldestKey);
    }
  }

  memoryCache.set(key, {
    data: value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
  return true;
}

export async function cacheDel(key) {
  if (isRedisReady()) {
    try {
      await redisClient.del(key);
    } catch (error) {
      logger.warn(`[Cache] Redis DEL error for ${key}: ${error.message}`);
    }
  }
  memoryCache.delete(key);
}

export async function cacheInvalidatePattern(patternPrefix) {
  if (isRedisReady()) {
    try {
      const stream = redisClient.scanStream({ match: `${patternPrefix}*`, count: 50 });
      stream.on("data", (keys) => {
        if (keys.length) {
          redisClient.del(...keys);
        }
      });
    } catch (error) {
      logger.warn(`[Cache] Redis SCAN/DEL error: ${error.message}`);
    }
  }

  for (const key of memoryCache.keys()) {
    if (key.startsWith(patternPrefix)) {
      memoryCache.delete(key);
    }
  }
}
