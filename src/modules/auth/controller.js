import * as authService from "./service.js";
import { successResponse } from "../../utils/response.js";

export async function login(request, response, nextFunction) {
  try {
    const clientInfo = {
      ip: request.ip,
      userAgent: request.headers["user-agent"],
    };
    const result = await authService.login(request.body, clientInfo);
    return successResponse(response, {
      statusCode: 200,
      message: "Authentication successful",
      data: result,
    });
  } catch (error) {
    nextFunction(error);
  }
}

export async function getProfile(request, response, nextFunction) {
  try {
    const profile = await authService.getProfile(request.user.id);
    return successResponse(response, {
      statusCode: 200,
      message: "Profile retrieved successfully",
      data: profile,
    });
  } catch (error) {
    nextFunction(error);
  }
}

export async function changePassword(request, response, nextFunction) {
  try {
    const clientInfo = {
      ip: request.ip,
      userAgent: request.headers["user-agent"],
    };
    const result = await authService.changePassword(request.user.id, request.body, clientInfo);
    return successResponse(response, {
      statusCode: 200,
      message: result.message,
    });
  } catch (error) {
    nextFunction(error);
  }
}

export async function logout(request, response, nextFunction) {
  try {
    const clientInfo = {
      ip: request.ip,
      userAgent: request.headers["user-agent"],
    };
    const refreshToken = request.body?.refreshToken;
    const result = await authService.logout(request.user, refreshToken, clientInfo);
    return successResponse(response, {
      statusCode: 200,
      message: result.message,
    });
  } catch (error) {
    nextFunction(error);
  }
}

export async function logoutAll(request, response, nextFunction) {
  try {
    const clientInfo = {
      ip: request.ip,
      userAgent: request.headers["user-agent"],
    };
    const result = await authService.logoutAll(request.user.id, clientInfo);
    return successResponse(response, {
      statusCode: 200,
      message: result.message,
    });
  } catch (error) {
    nextFunction(error);
  }
}

export async function refreshToken(request, response, nextFunction) {
  try {
    const clientInfo = {
      ip: request.ip,
      userAgent: request.headers["user-agent"],
    };
    const result = await authService.rotateRefreshToken(request.body.refreshToken, clientInfo);
    return successResponse(response, {
      statusCode: 200,
      message: "Access token refreshed successfully",
      data: result,
    });
  } catch (error) {
    nextFunction(error);
  }
}

export async function forgotPassword(request, response, nextFunction) {
  try {
    const clientInfo = {
      ip: request.ip,
      userAgent: request.headers["user-agent"],
    };
    const result = await authService.forgotPassword(request.body, clientInfo);
    return successResponse(response, {
      statusCode: 200,
      message: result.message,
    });
  } catch (error) {
    nextFunction(error);
  }
}

export async function resetPassword(request, response, nextFunction) {
  try {
    const clientInfo = {
      ip: request.ip,
      userAgent: request.headers["user-agent"],
    };
    const result = await authService.resetPassword(request.body, clientInfo);
    return successResponse(response, {
      statusCode: 200,
      message: result.message,
    });
  } catch (error) {
    nextFunction(error);
  }
}

export async function updateProfile(request, response, nextFunction) {
  try {
    const clientInfo = {
      ip: request.ip,
      userAgent: request.headers["user-agent"],
    };
    const updated = await authService.updateProfile(request.user.id, request.body, clientInfo);
    return successResponse(response, {
      statusCode: 200,
      message: "Profile updated successfully",
      data: updated,
    });
  } catch (error) {
    nextFunction(error);
  }
}

export async function verify2FALogin(request, response, nextFunction) {
  try {
    const clientInfo = {
      ip: request.ip,
      userAgent: request.headers["user-agent"],
    };
    const result = await authService.verify2FALogin(request.body, clientInfo);
    return successResponse(response, {
      statusCode: 200,
      message: "Two-factor authentication verified successfully",
      data: result,
    });
  } catch (error) {
    nextFunction(error);
  }
}

export async function setup2FA(request, response, nextFunction) {
  try {
    const clientInfo = {
      ip: request.ip,
      userAgent: request.headers["user-agent"],
    };
    const result = await authService.setup2FA(request.user.id, clientInfo);
    return successResponse(response, {
      statusCode: 200,
      message: "2FA setup initiated. Scan QR code and verify to complete activation.",
      data: result,
    });
  } catch (error) {
    nextFunction(error);
  }
}

export async function enable2FA(request, response, nextFunction) {
  try {
    const clientInfo = {
      ip: request.ip,
      userAgent: request.headers["user-agent"],
    };
    const result = await authService.enable2FA(request.user.id, request.body, clientInfo);
    return successResponse(response, {
      statusCode: 200,
      message: result.message,
      data: { isTwoFactorEnabled: result.isTwoFactorEnabled },
    });
  } catch (error) {
    nextFunction(error);
  }
}

export async function disable2FA(request, response, nextFunction) {
  try {
    const clientInfo = {
      ip: request.ip,
      userAgent: request.headers["user-agent"],
    };
    const result = await authService.disable2FA(request.user.id, request.body, clientInfo);
    return successResponse(response, {
      statusCode: 200,
      message: result.message,
      data: { isTwoFactorEnabled: result.isTwoFactorEnabled },
    });
  } catch (error) {
    nextFunction(error);
  }
}

export async function get2FAStatus(request, response, nextFunction) {
  try {
    const status = await authService.get2FAStatus(request.user.id);
    return successResponse(response, {
      statusCode: 200,
      message: "2FA status retrieved successfully",
      data: status,
    });
  } catch (error) {
    nextFunction(error);
  }
}

export async function regenerateBackupCodes(request, response, nextFunction) {
  try {
    const clientInfo = {
      ip: request.ip,
      userAgent: request.headers["user-agent"],
    };
    const result = await authService.regenerateBackupCodes(request.user.id, request.body, clientInfo);
    return successResponse(response, {
      statusCode: 200,
      message: result.message,
      data: { backupCodes: result.backupCodes },
    });
  } catch (error) {
    nextFunction(error);
  }
}

export async function listActiveSessions(request, response, nextFunction) {
  try {
    const sessions = await authService.listActiveSessions(request.user.id);
    return successResponse(response, {
      statusCode: 200,
      message: "Active device sessions retrieved successfully",
      data: sessions,
    });
  } catch (error) {
    nextFunction(error);
  }
}

export async function revokeSession(request, response, nextFunction) {
  try {
    const clientInfo = {
      ip: request.ip,
      userAgent: request.headers["user-agent"],
    };
    const result = await authService.revokeSession(request.user.id, request.params.sessionId, clientInfo);
    return successResponse(response, {
      statusCode: 200,
      message: result.message,
    });
  } catch (error) {
    nextFunction(error);
  }
}


