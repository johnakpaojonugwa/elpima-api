import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";

/**
 * Middleware: Verify Bearer JWT (pinned to HS256) and ensure user is still active in DB
 */
export async function requireAuth(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new AppError(401, "Authentication token required", "unauthorized"));
  }

  const token = authHeader.split(" ")[1];

  let payload;
  try {
    // Security: Pin algorithm explicitly to HS256 to prevent algorithm confusion attacks
    payload = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ["HS256"],
    });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return next(new AppError(401, "Session expired, please log in again", "token_expired"));
    }
    return next(new AppError(401, "Invalid authentication token", "unauthorized"));
  }

  // Security: Check database to ensure account hasn't been deactivated since token issuance
  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return next(
        new AppError(401, "Account has been deactivated or no longer exists", "account_deactivated")
      );
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware factory: Enforce Role-Based Access Control (RBAC)
 * @param {...string} allowedRoles
 */
export function requireRole(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError(401, "Authentication required", "unauthorized"));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          403,
          "You do not have permission to perform this action",
          "forbidden"
        )
      );
    }

    next();
  };
}
