import winston from "winston";
import { isProd, isTest } from "../config/env.js";

const { combine, timestamp, printf, colorize, json } = winston.format;

const consoleFormat = printf(({ level, message, timestamp, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
  return `[${timestamp}] ${level}: ${message}${metaStr}`;
});

export const logger = winston.createLogger({
  level: isProd ? "info" : "debug",
  silent: isTest,
  format: combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    isProd ? json() : combine(colorize(), consoleFormat)
  ),
  transports: [new winston.transports.Console()],
});

export const morganStream = {
  write: (message) => {
    try {
      const parsed = JSON.parse(message);
      logger.info("HTTP Request", parsed);
    } catch {
      logger.info(message.trim());
    }
  },
};
