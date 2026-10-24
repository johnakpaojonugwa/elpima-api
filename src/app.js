import express from "express";
import cors from "cors";
import helmet from "helmet";
import hpp from "hpp";
import morgan from "morgan";

import { env } from "./config/env.js";
import { router } from "./routes/index.js";
import { notFoundHandler, errorHandler } from "./middlewares/errorHandler.js";
import { morganStream } from "./utils/logger.js";
import { correlationId } from "./middlewares/correlationId.js";
import { globalRateLimiter } from "./middlewares/rateLimiter.js";
import { setupSwagger } from "./config/swagger.js";

function jsonAccessLog(tokens, req, res) {
  return JSON.stringify({
    msg: "http_request",
    correlationId: req.correlationId,
    method: tokens.method(req, res),
    url: tokens.url(req, res),
    status: Number(tokens.status(req, res)),
    durationMs: Number(tokens["response-time"](req, res)),
    ip: tokens["remote-addr"](req, res),
    actorId: req.user?.id || null,
    actorRole: req.user?.role || null,
  });
}

export function createApp() {
  const app = express();

  // Trust reverse proxies (Nginx, Render, Railway, Fly.io, etc.)
  app.set("trust proxy", 1);

  // Security headers
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(hpp());

  // Body parsers
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

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
