import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";

/**
 * Middleware: Verify Bearer JWT (pinned to HS256) and ensure user is still active in DB
 */
export async function requireAuth(request, _response, nextFunction) {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return nextFunction(new AppError(401, "Authentication token required", "unauthorized"));
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
      return nextFunction(new AppError(401, "Session expired, please log in again", "token_expired"));
    }
    return nextFunction(new AppError(401, "Invalid authentication token", "unauthorized"));
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
        tokenVersion: true,
      },
    });

    if (!user || !user.isActive) {
      return nextFunction(
        new AppError(401, "Account has been deactivated or no longer exists", "account_deactivated")
      );
    }

    // Security: Instant Global Revocation check
    // If the tokenVersion in the JWT does not match the user's current tokenVersion in DB,
    // this token was revoked (e.g. via logout, password change, or session hijack mitigation)!
    if (payload.tokenVersion !== undefined && payload.tokenVersion !== user.tokenVersion) {
      return nextFunction(
        new AppError(401, "Session has been revoked or invalidated. Please log in again.", "token_revoked")
      );
    }

    request.user = user;
    nextFunction();
  } catch (error) {
    nextFunction(error);
  }
}

/**
 * Middleware factory: Enforce Role-Based Access Control (RBAC)
 * @param {...string} allowedRoles
 */
export function requireRole(...allowedRoles) {
  return (request, _response, nextFunction) => {
    if (!request.user) {
      return nextFunction(new AppError(401, "Authentication required", "unauthorized"));
    }

    if (!allowedRoles.includes(request.user.role)) {
      return nextFunction(
        new AppError(
          403,
          "You do not have permission to perform this action",
          "forbidden"
        )
      );
    }

    nextFunction();
  };
}
