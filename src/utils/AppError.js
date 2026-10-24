export class AppError extends Error {
  /**
   * @param {number} statusCode - HTTP status code (e.g. 400, 401, 403, 404, 409, 422, 500)
   * @param {string} message - Human-readable error message
   * @param {string} [kind="operational_error"] - Error classification code
   * @param {object|Array} [details=null] - Additional validation or error context
   */
  constructor(statusCode, message, kind = "operational_error", details = null) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.kind = kind;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}
