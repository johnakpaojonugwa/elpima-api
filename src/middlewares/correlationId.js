import crypto from "node:crypto";

/**
 * Middleware that assigns or forwards an X-Request-Id header.
 */
export function correlationId(req, res, next) {
  const existingId = req.headers["x-request-id"];
  const id = existingId && typeof existingId === "string" ? existingId : crypto.randomUUID();

  req.correlationId = id;
  res.setHeader("X-Request-Id", id);

  next();
}
