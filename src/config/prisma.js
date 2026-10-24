import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger.js";
import { isDev } from "./env.js";

export const prisma = new PrismaClient({
  log: isDev ? ["warn", "error"] : ["error"],
});

export async function connectDb() {
  try {
    await prisma.$connect();
    logger.info("Database connection established successfully");
  } catch (error) {
    logger.error("Failed to connect to database:", error);
    throw error;
  }
}

export async function disconnectDb() {
  await prisma.$disconnect();
  logger.info("Database connection closed");
}
