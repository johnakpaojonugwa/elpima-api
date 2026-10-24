import { prisma } from "../../config/prisma.js";
import { ROLES } from "../../constants/roles.js";

export async function getDashboardStats() {
  const [
    totalProducts,
    activeProducts,
    inStockProducts,
    outOfStockProducts,
    featuredProducts,
    totalCategories,
    totalSpecialties,
    totalQuotes,
    quotesByStatus,
    urgentQuotes,
    activeManagers,
    recentQuotes,
    recentAuditLogs,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { isActive: true } }),
    prisma.product.count({ where: { isActive: true, inStock: true } }),
    prisma.product.count({ where: { isActive: true, inStock: false } }),
    prisma.product.count({ where: { isActive: true, isFeatured: true } }),
    prisma.category.count({ where: { isActive: true } }),
    prisma.specialty.count(),
    prisma.quoteInquiry.count(),
    prisma.quoteInquiry.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
    prisma.quoteInquiry.count({
      where: { priority: "URGENT", status: { in: ["NEW", "CONTACTED"] } },
    }),
    prisma.user.count({
      where: { role: ROLES.SUPERVISING_MANAGER, isActive: true },
    }),
    prisma.quoteInquiry.findMany({
      take: 5,
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
    }),
    prisma.auditLog.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        createdAt: true,
        actor: {
          select: { fullName: true, role: true },
        },
      },
    }),
  ]);

  const quoteStatusCounts = {
    NEW: 0,
    CONTACTED: 0,
    QUOTED: 0,
    FULFILLED: 0,
    CANCELLED: 0,
  };

  quotesByStatus.forEach((item) => {
    quoteStatusCounts[item.status] = item._count.status;
  });

  return {
    catalog: {
      totalProducts,
      activeProducts,
      inStockProducts,
      outOfStockProducts,
      featuredProducts,
      totalCategories,
      totalSpecialties,
    },
    quotes: {
      total: totalQuotes,
      urgentPending: urgentQuotes,
      byStatus: quoteStatusCounts,
      recent: recentQuotes,
    },
    team: {
      activeManagers,
    },
    audit: {
      recentEvents: recentAuditLogs,
    },
  };
}
