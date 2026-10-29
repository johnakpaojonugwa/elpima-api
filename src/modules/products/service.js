import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { cacheGet, cacheSet, cacheInvalidatePattern } from "../../config/redis.js";

const CATEGORY_CODE_MAP = {
  "endoscopic-powered-staplers": "END",
  "open-linear-circular-staplers": "OPN",
  "anorectal-urological-staplers": "SPC",
  "wound-fascial-closure-systems": "CLS",
  "laparoscopic-access-consumables": "LAP",
};

function deriveCategoryCode(category) {
  if (!category) return "SRG";
  if (CATEGORY_CODE_MAP[category.slug]) {
    return CATEGORY_CODE_MAP[category.slug];
  }
  const prefixMatch = (category.description || "").match(/Prefix:\s*([A-Z]{3})/i);
  if (prefixMatch) {
    return prefixMatch[1].toUpperCase();
  }
  const letters = (category.name || "")
    .replace(/[^a-zA-Z\s]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (letters.length >= 3) {
    return (letters[0][0] + letters[1][0] + letters[2][0]).toUpperCase();
  }
  return (category.name || "SRG").replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase().padEnd(3, "X");
}

function deriveDeviceCode(productName) {
  const stopWords = new Set(["AND", "THE", "FOR", "WITH", "SYSTEM", "DISPOSABLE"]);
  const words = (productName || "")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .toUpperCase()
    .split(/\s+/)
    .filter((w) => w.length > 0 && !stopWords.has(w));

  if (words.length >= 3) {
    return `${words[0][0]}${words[1][0]}${words[2][0]}`;
  }
  if (words.length === 2) {
    return `${words[0].slice(0, 2)}${words[1][0]}`.padEnd(3, "X");
  }
  if (words.length === 1) {
    return words[0].slice(0, 3).padEnd(3, "X");
  }
  return "DEV";
}

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
}

export async function listProducts({
  page = 1,
  limit = 20,
  search,
  category,
  specialty,
  inStock,
  featured,
  sort = "newest",
  includeInactive = false,
}) {
  const skip = (page - 1) * limit;

  // Build where filter
  const where = {
    ...(includeInactive ? {} : { isActive: true }),
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
      { shortDescription: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  if (category) {
    where.category = {
      OR: [{ id: category }, { slug: category }],
    };
  }

  if (specialty) {
    where.specialty = {
      OR: [{ id: specialty }, { slug: specialty }],
    };
  }

  if (inStock !== undefined) {
    where.inStock = inStock === "true";
  }

  if (featured !== undefined) {
    where.isFeatured = featured === "true";
  }

  // Sort orders
  let orderBy = [{ createdAt: "desc" }];
  if (sort === "oldest") orderBy = [{ createdAt: "asc" }];
  if (sort === "name_asc") orderBy = [{ name: "asc" }];
  if (sort === "name_desc") orderBy = [{ name: "desc" }];
  if (sort === "popular") orderBy = [{ viewCount: "desc" }, { createdAt: "desc" }];

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        shortDescription: true,
        description: true,
        specifications: true,
        images: true,
        inStock: true,
        leadTime: true,
        isFeatured: true,
        isActive: true,
        compliance: true,
        minOrderQuantity: true,
        viewCount: true,
        categoryId: true,
        specialtyId: true,
        category: {
          select: { id: true, name: true, slug: true },
        },
        specialty: {
          select: { id: true, name: true, slug: true },
        },
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  return { total, page, limit, products };
}

export async function getProductBySlug(slug) {
  const cacheKey = `products:slug:${slug}`;
  const cached = await cacheGet(cacheKey);

  if (cached) {
    // Fire-and-forget view count increment
    prisma.product.update({
      where: { id: cached.id },
      data: { viewCount: { increment: 1 } },
    }).catch(() => {});

    return cached;
  }

  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      category: {
        select: { id: true, name: true, slug: true },
      },
      specialty: {
        select: { id: true, name: true, slug: true },
      },
    },
  });

  if (!product || !product.isActive) {
    throw new AppError(404, "Product not found or inactive", "product_not_found");
  }

  // Cache for 10 minutes (600 seconds)
  await cacheSet(cacheKey, product, 600);

  // Fire-and-forget view count increment
  prisma.product.update({
    where: { id: product.id },
    data: { viewCount: { increment: 1 } },
  }).catch(() => {});

  return product;
}

export async function createProduct(input, actor, clientInfo = {}) {
  const slug = input.slug || slugify(input.name);

  // Validate category existence
  const category = await prisma.category.findUnique({
    where: { id: input.categoryId },
  });
  if (!category) {
    throw new AppError(400, "Referenced category does not exist", "bad_request");
  }

  // Validate unique slug
  const existingSlug = await prisma.product.findUnique({
    where: { slug },
  });
  if (existingSlug) {
    throw new AppError(409, "A product with that slug already exists", "conflict");
  }

  // Auto-generate clinical SKU (ELP-[CATEGORY_CODE]-[DEVICE_CODE]-[MODEL_NUMBER]) if not provided
  let normalizedSku = input.sku ? input.sku.trim().toUpperCase() : null;
  if (!normalizedSku) {
    const totalCount = await prisma.product.count();
    const catCode = deriveCategoryCode(category);
    const devCode = deriveDeviceCode(input.name);
    const modelNum = String(totalCount + 1).padStart(3, "0");
    normalizedSku = `ELP-${catCode}-${devCode}-${modelNum}`;
  }

  // Validate unique SKU
  const existingSku = await prisma.product.findUnique({
    where: { sku: normalizedSku },
  });
  if (existingSku) {
    throw new AppError(409, "A product with that SKU already exists", "conflict");
  }

  const defaultSpecifications =
    input.specifications && Object.keys(input.specifications).length > 0
      ? input.specifications
      : {
          "Model Reference": `${normalizedSku} — ${input.name}`,
          Material: "Medical-Grade Titanium (Ti) & 316L Surgical Stainless Steel",
          Sterilization: "Ethylene Oxide (EO) Sterile, Single-Use",
        };

  const product = await prisma.product.create({
    data: {
      name: input.name,
      slug,
      sku: normalizedSku,
      categoryId: input.categoryId,
      specialtyId: input.specialtyId,
      shortDescription: input.shortDescription,
      description: input.description,
      specifications: defaultSpecifications,
      compliance: input.compliance ?? ["ISO 13485", "CE Mark", "NAFDAC Approved"],
      images: input.images,
      inStock: input.inStock ?? true,
      leadTime: input.leadTime,
      minOrderQuantity: input.minOrderQuantity ?? 1,
      isFeatured: input.isFeatured ?? false,
      isActive: input.isActive ?? true,
    },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      specialty: { select: { id: true, name: true, slug: true } },
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorRole: actor.role,
      action: "CREATE_PRODUCT",
      entityType: "product",
      entityId: product.id,
      metadata: { name: product.name, sku: product.sku },
      ipAddress: clientInfo.ip || null,
      userAgent: clientInfo.userAgent || null,
    },
  });

  await cacheInvalidatePattern("products:");

  return product;
}

export async function updateProduct(productId, input, actor, clientInfo = {}) {
  const existing = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!existing) {
    throw new AppError(404, "Product not found", "product_not_found");
  }

  const slug = input.slug ? slugify(input.slug) : input.name ? slugify(input.name) : undefined;

  const product = await prisma.product.update({
    where: { id: productId },
    data: {
      ...input,
      ...(slug ? { slug } : {}),
    },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      specialty: { select: { id: true, name: true, slug: true } },
    },
  });

  // Audit log with before & after state diffing
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorRole: actor.role,
      action: "UPDATE_PRODUCT",
      entityType: "product",
      entityId: product.id,
      metadata: {
        before: {
          name: existing.name,
          sku: existing.sku,
          categoryId: existing.categoryId,
          inStock: existing.inStock,
          leadTime: existing.leadTime,
          isFeatured: existing.isFeatured,
          isActive: existing.isActive,
        },
        after: input,
      },
      ipAddress: clientInfo.ip || null,
      userAgent: clientInfo.userAgent || null,
    },
  });

  await cacheInvalidatePattern("products:");

  return product;
}

export async function toggleStock(productId, { inStock, leadTime }, actor, clientInfo = {}) {
  const product = await prisma.product.update({
    where: { id: productId },
    data: {
      inStock,
      ...(leadTime !== undefined ? { leadTime } : {}),
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorRole: actor.role,
      action: "TOGGLE_PRODUCT_STOCK",
      entityType: "product",
      entityId: product.id,
      metadata: { inStock, leadTime },
      ipAddress: clientInfo.ip || null,
      userAgent: clientInfo.userAgent || null,
    },
  });

  await cacheInvalidatePattern("products:");

  return product;
}

export async function deleteProduct(productId, actor, clientInfo = {}) {
  // Soft delete: mark inactive to preserve historical quotation snapshots
  const product = await prisma.product.update({
    where: { id: productId },
    data: { isActive: false },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorRole: actor.role,
      action: "DEACTIVATE_PRODUCT",
      entityType: "product",
      entityId: product.id,
      metadata: { name: product.name },
      ipAddress: clientInfo.ip || null,
      userAgent: clientInfo.userAgent || null,
    },
  });

  await cacheInvalidatePattern("products:");

  return product;
}

export async function getProductById(productId) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      specialty: { select: { id: true, name: true, slug: true } },
    },
  });

  if (!product) {
    throw new AppError(404, "Product not found", "product_not_found");
  }

  return product;
}

export async function getRelatedProducts(slug, limit = 4) {
  const current = await prisma.product.findUnique({
    where: { slug },
    select: { id: true, categoryId: true, specialtyId: true },
  });

  if (!current) {
    throw new AppError(404, "Product not found", "product_not_found");
  }

  const where = {
    isActive: true,
    id: { not: current.id },
    OR: [
      { categoryId: current.categoryId },
      ...(current.specialtyId ? [{ specialtyId: current.specialtyId }] : []),
    ],
  };

  const related = await prisma.product.findMany({
    where,
    take: limit,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      sku: true,
      shortDescription: true,
      images: true,
      inStock: true,
      category: { select: { id: true, name: true, slug: true } },
      specialty: { select: { id: true, name: true, slug: true } },
    },
  });

  return related;
}
