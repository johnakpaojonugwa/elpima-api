import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { getRedisClient } from "../config/redis.js";
import { isTest } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

/**
 * Creates a RedisStore for distributed rate limiting across horizontal instances,
 * gracefully falling back to in-memory store if Redis is absent or in test mode.
 */
function getRateLimitStore(prefix) {
  const client = getRedisClient();
  if (!isTest && client) {
    try {
      return new RedisStore({
        sendCommand: (...args) => client.call(...args),
        prefix: `rl:${prefix}:`,
      });
    } catch {
      return undefined;
    }
  }
  return undefined;
}

/**
 * Standard global API rate limiter (cluster-wide with Redis)
 */
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
  store: getRateLimitStore("global"),
  handler: (_request, _response, nextFunction) => {
    nextFunction(new AppError(429, "Too many requests. Please try again later.", "rate_limit_exceeded"));
  },
});

/**
 * Strict rate limiter for authentication endpoints (prevents brute-force)
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Max 10 attempts per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
  store: getRateLimitStore("auth"),
  handler: (_request, _response, nextFunction) => {
    nextFunction(new AppError(429, "Too many failed login attempts. Please wait 15 minutes.", "auth_throttled"));
  },
});

/**
 * Public quote / inquiry rate limiter (prevents spam inquiries)
 */
export const quoteRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 15, // Max 15 quote submissions per 10 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
  store: getRateLimitStore("quote"),
  handler: (_request, _response, nextFunction) => {
    nextFunction(new AppError(429, "You have submitted multiple quote requests. Please wait a few minutes before submitting another.", "quote_limit_exceeded"));
  },
});

/**
 * Strict rate limiter for CPU-intensive PDF document generation and anti-harvesting
 */
export const pdfRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 25, // Max 25 PDF downloads per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
  store: getRateLimitStore("pdf"),
  handler: (_request, _response, nextFunction) => {
    nextFunction(new AppError(429, "Too many PDF download requests. Please wait a few minutes.", "pdf_rate_limit_exceeded"));
  },
});
