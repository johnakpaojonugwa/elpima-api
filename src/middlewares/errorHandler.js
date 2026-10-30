import { AppError } from "../utils/AppError.js";
import { logger } from "../utils/logger.js";
import { isProd } from "../config/env.js";

/**
 * 404 Not Found fallback handler
 */
export function notFoundHandler(request, response, nextFunction) {
  nextFunction(new AppError(404, `Cannot ${request.method} ${request.originalUrl}`, "not_found"));
}

/**
 * Central Error Handler
 */
export function errorHandler(error, request, response, _nextFunction) {
  const correlationId = request.correlationId || "unknown";

  // Default values
  let statusCode = 500;
  let message = "An unexpected server error occurred";
  let kind = "server_error";
  let details = null;

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    kind = error.kind;
    details = error.details;
  } else if (error.name === "MulterError") {
    if (error.code === "LIMIT_FILE_SIZE") {
      statusCode = 413;
      message = "File size exceeds the allowable limit of 5MB per image";
      kind = "file_too_large";
    } else if (error.code === "LIMIT_FILE_COUNT") {
      statusCode = 400;
      message = "Too many files uploaded in a single request (maximum 10 images)";
      kind = "too_many_files";
    } else {
      statusCode = 400;
      message = `File upload error: ${error.message}`;
      kind = "upload_error";
    }
    details = { field: error.field, code: error.code };
  } else if (error.name === "ZodError") {
    statusCode = 422;
    message = "Request validation failed";
    kind = "validation_error";
    details = error.errors;
  } else if (error.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid authentication token";
    kind = "unauthorized";
  } else if (error.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Authentication token expired";
    kind = "token_expired";
  } else if (error.code === "P2002") {
    statusCode = 409;
    message = "A resource with this unique value already exists";
    kind = "conflict";
    details = error.meta;
  } else if (error.code === "P2003") {
    statusCode = 409;
    message = "Operation failed due to related records constraint";
    kind = "foreign_key_violation";
    details = error.meta;
  } else if (error.code === "P2023") {
    statusCode = 400;
    message = "Invalid format provided for query parameter or identifier";
    kind = "bad_request";
  } else if (error.code === "P2025") {
    statusCode = 404;
    message = "Requested record not found";
    kind = "not_found";
  }

  // Log error (with stack trace for unhandled server errors)
  if (statusCode >= 500) {
    logger.error(`[${correlationId}] Internal Server Error: ${error.message}`, {
      stack: error.stack,
      url: request.originalUrl,
      method: request.method,
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
      ...(!isProd && statusCode >= 500 ? { stack: error.stack } : {}),
    },
  };

  response.status(statusCode).json(responsePayload);
}
