import { prisma } from "../../config/prisma.js";
import { env } from "../../config/env.js";

export async function getSettings() {
  let settings = await prisma.storeSetting.findUnique({
    where: { id: "default" },
  });

  if (!settings) {
    settings = await prisma.storeSetting.create({
      data: {
        id: "default",
        whatsappNumber: env.DEFAULT_WHATSAPP_NUMBER,
        companyName: env.COMPANY_NAME,
        companyEmail: env.COMPANY_EMAIL,
        companyPhone: env.COMPANY_PHONE,
        companyAddress: env.COMPANY_ADDRESS,
      },
    });
  }

  return settings;
}

export async function updateSettings(input, actor) {
  const updated = await prisma.storeSetting.upsert({
    where: { id: "default" },
    update: input,
    create: {
      id: "default",
      ...input,
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorRole: actor.role,
      action: "UPDATE_STORE_SETTINGS",
      entityType: "settings",
      entityId: "default",
      metadata: input,
    },
  });

  return updated;
}
