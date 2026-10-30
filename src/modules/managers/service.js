import bcrypt from "bcryptjs";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { ROLES } from "../../constants/roles.js";

export async function listManagers() {
  return prisma.user.findMany({
    where: { role: ROLES.SUPERVISING_MANAGER },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      _count: {
        select: { assignedQuotes: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createManager(input, actor) {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existing) {
    throw new AppError(409, "A user with that email already exists", "conflict");
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const manager = await prisma.user.create({
    data: {
      fullName: input.fullName,
      email: input.email,
      phone: input.phone || null,
      passwordHash,
      role: ROLES.SUPERVISING_MANAGER,
      isActive: true,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorRole: actor.role,
      action: "CREATE_MANAGER",
      entityType: "user",
      entityId: manager.id,
      metadata: { fullName: manager.fullName, email: manager.email },
    },
  });

  // Enqueue welcome email with credentials & 2FA guidance via BullMQ
  if (manager.email) {
    import("../../queues/index.js").then(({ queueManagerInviteEmail }) => {
      queueManagerInviteEmail({
        toEmail: manager.email,
        recipientName: manager.fullName,
        temporaryPassword: input.password,
        role: manager.role,
      }).catch(() => {});
    });
  }

  // In-app notification for manager provisioning
  import("../notifications/service.js").then(({ createNotification }) => {
    createNotification({
      category: "GENERAL",
      iconType: "MANAGER",
      title: "New Supervising Manager Provisioned",
      description: `${manager.fullName} was provisioned as a Supervising Manager`,
      metadata: { managerId: manager.id, email: manager.email, role: manager.role },
    }).catch(() => {});
  });

  return manager;
}

export async function updateManagerStatus(managerId, { isActive }, actor) {
  const manager = await prisma.user.findUnique({
    where: { id: managerId },
  });

  if (!manager) {
    throw new AppError(404, "User not found", "user_not_found");
  }

  if (manager.role === ROLES.SUPER_ADMIN && !isActive) {
    throw new AppError(400, "Super-Admin cannot be deactivated", "bad_request");
  }

  // Security: If deactivating manager, revoke all refresh tokens and increment tokenVersion immediately
  if (!isActive) {
    await prisma.refreshToken.updateMany({
      where: { userId: managerId, isRevoked: false },
      data: { isRevoked: true },
    });
  }

  const updated = await prisma.user.update({
    where: { id: managerId },
    data: {
      isActive,
      ...(!isActive ? { tokenVersion: { increment: 1 } } : {}),
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorRole: actor.role,
      action: "ACTIVATE_USER",
      entityType: "user",
      entityId: updated.id,
      metadata: { isActive },
    },
  });

  return updated;
}

export async function getManagerById(managerId) {
  const manager = await prisma.user.findUnique({
    where: { id: managerId },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      assignedQuotes: {
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          reference: true,
          customerName: true,
          hospitalName: true,
          status: true,
          priority: true,
          createdAt: true,
        },
      },
      _count: {
        select: { assignedQuotes: true },
      },
    },
  });

  if (!manager) {
    throw new AppError(404, "Supervising Manager not found", "user_not_found");
  }

  return manager;
}

export async function updateManager(managerId, input, actor, clientInfo = {}) {
  const existing = await prisma.user.findUnique({
    where: { id: managerId },
  });

  if (!existing) {
    throw new AppError(404, "Supervising Manager not found", "user_not_found");
  }

  if (input.email && input.email !== existing.email) {
    const emailConflict = await prisma.user.findUnique({
      where: { email: input.email },
    });
    if (emailConflict) {
      throw new AppError(409, "Email address is already taken by another account", "conflict");
    }
  }

  let passwordHash;
  if (input.password) {
    passwordHash = await bcrypt.hash(input.password, 12);

    // Security: Revoke all existing refresh tokens if password was changed
    await prisma.refreshToken.updateMany({
      where: { userId: managerId, isRevoked: false },
      data: { isRevoked: true },
    });
  }

  const updated = await prisma.user.update({
    where: { id: managerId },
    data: {
      ...(input.fullName ? { fullName: input.fullName } : {}),
      ...(input.email ? { email: input.email } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(passwordHash ? { passwordHash, tokenVersion: { increment: 1 } } : {}),
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      updatedAt: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorRole: actor.role,
      action: "UPDATE_MANAGER",
      entityType: "user",
      entityId: managerId,
      metadata: { updatedFields: Object.keys(input) },
      ipAddress: clientInfo.ip || null,
      userAgent: clientInfo.userAgent || null,
    },
  });

  return updated;
}

export async function deleteManager(managerId, actor, clientInfo = {}) {
  const manager = await prisma.user.findUnique({
    where: { id: managerId },
  });

  if (!manager) {
    throw new AppError(404, "Supervising Manager not found", "user_not_found");
  }

  if (manager.role === ROLES.SUPER_ADMIN) {
    throw new AppError(400, "Super-Admin accounts cannot be deleted", "bad_request");
  }

  await prisma.user.delete({
    where: { id: managerId },
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorRole: actor.role,
      action: "DELETE_MANAGER",
      entityType: "user",
      entityId: managerId,
      metadata: { fullName: manager.fullName, email: manager.email },
      ipAddress: clientInfo.ip || null,
      userAgent: clientInfo.userAgent || null,
    },
  });

  return { message: "Supervising Manager deleted successfully" };
}
