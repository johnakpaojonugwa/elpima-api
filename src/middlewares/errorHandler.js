import { AppError } from "../utils/AppError.js";
import { logger } from "../utils/logger.js";
import { isProd } from "../config/env.js";

/**
 * 404 Not Found fallback handler
 */
export function notFoundHandler(req, res, next) {
  next(new AppError(404, `Cannot ${req.method} ${req.originalUrl}`, "not_found"));
}

/**
 * Central Error Handler
 */
export function errorHandler(err, req, res, _next) {
  const correlationId = req.correlationId || "unknown";

  // Default values
  let statusCode = 500;
  let message = "An unexpected server error occurred";
  let kind = "server_error";
  let details = null;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    kind = err.kind;
    details = err.details;
  } else if (err.name === "ZodError") {
    statusCode = 422;
    message = "Request validation failed";
    kind = "validation_error";
    details = err.errors;
  } else if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid authentication token";
    kind = "unauthorized";
  } else if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Authentication token expired";
    kind = "token_expired";
  } else if (err.code === "P2002") {
    statusCode = 409;
    message = "A resource with this unique value already exists";
    kind = "conflict";
    details = err.meta;
  } else if (err.code === "P2003") {
    statusCode = 409;
    message = "Operation failed due to related records constraint";
    kind = "foreign_key_violation";
    details = err.meta;
  } else if (err.code === "P2023") {
    statusCode = 400;
    message = "Invalid format provided for query parameter or identifier";
    kind = "bad_request";
  } else if (err.code === "P2025") {
    statusCode = 404;
    message = "Requested record not found";
    kind = "not_found";
  }

  // Log error (with stack trace for unhandled server errors)
  if (statusCode >= 500) {
    logger.error(`[${correlationId}] Internal Server Error: ${err.message}`, {
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
    });
  } else {
    logger.warn(`[${correlationId}] Handled Client Error: ${message} (${statusCode})`);
  }

  const responsePayload = {
    success: false,
    error: {
      message,
      kind,
      correlationId,
      ...(details ? { details } : {}),
      ...(!isProd && statusCode >= 500 ? { stack: err.stack } : {}),
    },
  };

  res.status(statusCode).json(responsePayload);
}
