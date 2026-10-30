import express from "express";
import cors from "cors";
import helmet from "helmet";
import hpp from "hpp";
import compression from "compression";
import morgan from "morgan";

import { env } from "./config/env.js";
import { router } from "./routes/index.js";
import { notFoundHandler, errorHandler } from "./middlewares/errorHandler.js";
import { morganStream } from "./utils/logger.js";
import { correlationId } from "./middlewares/correlationId.js";
import { globalRateLimiter } from "./middlewares/rateLimiter.js";
import { setupSwagger } from "./config/swagger.js";

function jsonAccessLog(tokens, request, response) {
  const rawUrl = tokens.url(request, response) || "";
  // Redact sensitive query parameters (e.g. JWT in SSE stream URLs, reset tokens, API keys)
  const sanitizedUrl = rawUrl.replace(
    /([?&](?:token|secret|password|key|apiKey)=)[^&]+/gi,
    "$1[REDACTED]"
  );

  return JSON.stringify({
    message: "http_request",
    correlationId: request.correlationId,
    method: tokens.method(request, response),
    url: sanitizedUrl,
    status: Number(tokens.status(request, response)),
    durationMs: Number(tokens["response-time"](request, response)),
    ip: tokens["remote-addr"](request, response),
    actorId: request.user?.id || null,
    actorRole: request.user?.role || null,
  });
}

export function createApp() {
  const app = express();

  // Trust reverse proxies (Nginx, Render, Railway, Fly.io, etc.)
  app.set("trust proxy", 1);

  // Security headers
  app.use(helmet());
  const allowedOrigins = env.CORS_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean);
  app.use(
    cors({
      origin: allowedOrigins.includes("*") ? true : allowedOrigins,
      credentials: true,
      exposedHeaders: ["Content-Disposition", "X-Request-Id"],
    })
  );
  app.use(hpp());

  // HTTP response compression (60-80% smaller JSON responses)
  app.use(compression());

  // Body parsers (strictly capped to prevent payload flooding)
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));

  // Static assets (for local upload fallback)
  app.use("/uploads", express.static("uploads"));

  // Request correlation ID
  app.use(correlationId);

  // Structured access logs
  app.use(morgan(jsonAccessLog, { stream: morganStream }));

  // Baseline global rate limit
  app.use(globalRateLimiter);

  // OpenAPI Swagger Documentation
  setupSwagger(app);

  // Application routes
  app.use(router);

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
