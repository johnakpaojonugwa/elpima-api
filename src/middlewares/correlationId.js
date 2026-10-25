import crypto from "node:crypto";

/**
 * Middleware that assigns or forwards an X-Request-Id header.
 */
export function correlationId(request, response, nextFunction) {
  const existingId = request.headers["x-request-id"];
  const correlationIdentifier = existingId && typeof existingId === "string" ? existingId : crypto.randomUUID();

  request.correlationId = correlationIdentifier;
  response.setHeader("X-Request-Id", correlationIdentifier);

  nextFunction();
}
