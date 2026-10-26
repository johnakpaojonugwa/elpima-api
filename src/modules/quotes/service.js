import { prisma } from "../../config/prisma.js";
import { generateQuoteReference } from "../../utils/reference.js";
import { buildWhatsAppQuoteUrl } from "../../utils/whatsapp.js";
import { AppError } from "../../utils/AppError.js";

export async function getStoreSettings() {
  return prisma.storeSetting.findUnique({
    where: { id: "default" },
  });
}

/**
 * Public quote creation and WhatsApp deep-link generation
 */
export async function createQuote(input) {
  // 1. Fetch current store settings for target WhatsApp number
  const settings = await getStoreSettings();
  const targetWhatsappNumber = settings?.whatsappNumber;

  // 2. Fetch products to get point-in-time names and SKUs
  const productIds = input.items.map((quoteItem) => quoteItem.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, sku: true, inStock: true },
  });

  const productMap = new Map(products.map((product) => [product.id, product]));

  // Validate that all items exist
  for (const item of input.items) {
    if (!productMap.has(item.productId)) {
      throw new AppError(400, `Product with ID ${item.productId} was not found`, "invalid_item");
    }
  }

  // 3. Generate unique reference code
  const reference = generateQuoteReference();

  // 4. Prepare items snapshot
  const itemSnapshots = input.items.map((item) => {
    const product = productMap.get(item.productId);
    return {
      productId: item.productId,
      productName: product.name,
      productSku: product.sku,
      quantity: item.quantity,
      customRequirement: item.customRequirement,
    };
  });

  // 5. Generate formatted WhatsApp URL
  const whatsappLink = buildWhatsAppQuoteUrl({
    reference,
    customerName: input.customerName,
    hospitalClinic: input.hospitalClinic,
    location: input.location,
    items: itemSnapshots,
    customerNotes: input.customerNotes,
    targetPhoneNumber: targetWhatsappNumber,
  });

  // 6. Save quote inquiry record in database
  const quote = await prisma.quoteInquiry.create({
    data: {
      reference,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerEmail: input.customerEmail || null,
      hospitalClinic: input.hospitalClinic || null,
      location: input.location || null,
      priority: input.priority,
      customerNotes: input.customerNotes || null,
      whatsappLink,
      items: {
        create: itemSnapshots.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          productSku: item.productSku,
          quantity: item.quantity,
          customRequirement: item.customRequirement || null,
        })),
      },
    },
    include: {
      items: true,
    },
  });

  // Enqueue sales desk alert with automated retries via BullMQ
  import("../../queues/index.js").then(({ queueSalesDeskNotification }) => {
    queueSalesDeskNotification(quote).catch(() => {});
  });

  // Enqueue customer quote confirmation email via BullMQ
  if (quote.customerEmail) {
    import("../../queues/index.js").then(({ queueQuoteConfirmationEmail }) => {
      queueQuoteConfirmationEmail({ quote }).catch(() => {});
    });
  }

  return {
    reference: quote.reference,
    whatsappLink: quote.whatsappLink,
    quote,
  };
}

/**
 * List quote inquiries (for Super-Admin & Supervising Manager)
 */
export async function listQuotes({ page = 1, limit = 20, status, priority, search }) {
  const skip = (page - 1) * limit;

  const where = {};

  if (status) {
    where.status = status;
  }

  if (priority) {
    where.priority = priority;
  }

  if (search) {
    where.OR = [
      { reference: { contains: search, mode: "insensitive" } },
      { customerName: { contains: search, mode: "insensitive" } },
      { customerPhone: { contains: search, mode: "insensitive" } },
      { hospitalClinic: { contains: search, mode: "insensitive" } },
    ];
  }

  const [total, quotes] = await Promise.all([
    prisma.quoteInquiry.count({ where }),
    prisma.quoteInquiry.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ createdAt: "desc" }],
      include: {
        items: true,
        assignedTo: {
          select: { id: true, fullName: true, email: true },
        },
      },
    }),
  ]);

  return { total, page, limit, quotes };
}

/**
 * Get quote details by reference
 */
export async function getQuoteByReference(reference) {
  const quote = await prisma.quoteInquiry.findUnique({
    where: { reference },
    include: {
      items: {
        include: {
          product: {
            select: { id: true, name: true, slug: true, images: true, inStock: true },
          },
        },
      },
      assignedTo: {
        select: { id: true, fullName: true, email: true, phone: true },
      },
    },
  });

  if (!quote) {
    throw new AppError(404, "Quote inquiry not found", "quote_not_found");
  }

  return quote;
}

/**
 * Update quote status and admin notes
 */
export async function updateQuoteStatus(quoteId, { status, adminNotes }, actor) {
  const existing = await prisma.quoteInquiry.findUnique({
    where: { id: quoteId },
  });

  if (!existing) {
    throw new AppError(404, "Quote inquiry not found", "quote_not_found");
  }

  const quote = await prisma.quoteInquiry.update({
    where: { id: quoteId },
    data: {
      status,
      ...(adminNotes !== undefined ? { adminNotes } : {}),
    },
    include: {
      items: true,
      assignedTo: { select: { id: true, fullName: true } },
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorRole: actor.role,
      action: "UPDATE_QUOTE_STATUS",
      entityType: "quote",
      entityId: quote.id,
      metadata: { previousStatus: existing.status, newStatus: status, adminNotes },
    },
  });

  return quote;
}

/**
 * Assign quote to a Supervising Manager
 */
export async function assignQuote(quoteId, { assignedToId }, actor) {
  const manager = await prisma.user.findUnique({
    where: { id: assignedToId },
  });

  if (!manager || !manager.isActive) {
    throw new AppError(404, "Supervising Manager not found or inactive", "manager_not_found");
  }

  const quote = await prisma.quoteInquiry.update({
    where: { id: quoteId },
    data: { assignedToId },
    include: {
      assignedTo: { select: { id: true, fullName: true, email: true } },
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorRole: actor.role,
      action: "ASSIGN_QUOTE",
      entityType: "quote",
      entityId: quote.id,
      metadata: { assignedTo: manager.fullName, assignedToId: manager.id },
    },
  });

  return quote;
}

/**
 * Get aggregate quote metrics by status for admin badges and dashboard
 */
export async function getQuoteStats() {
  const [total, byStatus, urgent] = await Promise.all([
    prisma.quoteInquiry.count(),
    prisma.quoteInquiry.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
    prisma.quoteInquiry.count({
      where: { priority: "URGENT", status: { in: ["NEW", "CONTACTED"] } },
    }),
  ]);

  const stats = {
    total,
    urgentPending: urgent,
    NEW: 0,
    CONTACTED: 0,
    QUOTED: 0,
    FULFILLED: 0,
    CANCELLED: 0,
  };

  byStatus.forEach((item) => {
    stats[item.status] = item._count.status;
  });

  return stats;
}

/**
 * Delete / Archive a spam or cancelled quote inquiry (Super-Admin only)
 */
export async function deleteQuote(quoteId, actor, clientInfo = {}) {
  const quote = await prisma.quoteInquiry.findUnique({
    where: { id: quoteId },
  });

  if (!quote) {
    throw new AppError(404, "Quote inquiry not found", "quote_not_found");
  }

  await prisma.quoteInquiry.delete({
    where: { id: quoteId },
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorRole: actor.role,
      action: "DELETE_QUOTE",
      entityType: "quote",
      entityId: id,
      metadata: { reference: quote.reference, customerName: quote.customerName },
      ipAddress: clientInfo.ip || null,
      userAgent: clientInfo.userAgent || null,
    },
  });

  return { message: "Quote inquiry deleted successfully" };
}
