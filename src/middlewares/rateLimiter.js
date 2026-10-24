import rateLimit from "express-rate-limit";
import { AppError } from "../utils/AppError.js";

/**
 * Standard global API rate limiter
 */
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(new AppError(429, "Too many requests. Please try again later.", "rate_limit_exceeded"));
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
  handler: (_req, _res, next) => {
    next(new AppError(429, "Too many failed login attempts. Please wait 15 minutes.", "auth_throttled"));
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
  handler: (_req, _res, next) => {
    next(new AppError(429, "You have submitted multiple quote requests. Please wait a few minutes before submitting another.", "quote_limit_exceeded"));
  },
});
