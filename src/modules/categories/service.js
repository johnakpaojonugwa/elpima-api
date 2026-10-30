import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { cacheGet, cacheSet, cacheInvalidatePattern } from "../../config/redis.js";

const CATEGORY_PREFIX_PRESETS = {
  "endoscopic-powered-staplers": "END",
  "open-linear-circular-staplers": "OPN",
  "anorectal-urological-staplers": "SPC",
  "wound-fascial-closure-systems": "CLS",
  "laparoscopic-access-consumables": "LAP",
};

function deriveCategoryPrefix(name, slug, description) {
  const existingMatch = (description || "").match(/Prefix:\s*([A-Z0-9]{3})/i);
  if (existingMatch) return existingMatch[1].toUpperCase();
  if (slug && CATEGORY_PREFIX_PRESETS[slug]) return CATEGORY_PREFIX_PRESETS[slug];

  const words = (name || "")
    .replace(/[^a-zA-Z\s]/g, "")
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 1 && !["AND", "THE", "FOR", "OF"].includes(word.toUpperCase()));

  if (words.length >= 3) {
    return `${words[0][0]}${words[1][0]}${words[2][0]}`.toUpperCase();
  }
  if (words.length === 2) {
    return `${words[0].slice(0, 2)}${words[1][0]}`.toUpperCase();
  }
  return (name || "CAT").replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase().padEnd(3, "X");
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

export async function listCategories({ includeInactive = false } = {}) {
  const cacheKey = includeInactive ? "categories:all" : "categories:active";
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const where = includeInactive ? {} : { isActive: true };

  const categories = await prisma.category.findMany({
    where,
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    include: {
      _count: {
        select: { products: { where: { isActive: true } } },
      },
    },
  });

  await cacheSet(cacheKey, categories, 300); // 5 min TTL
  return categories;
}

export async function getCategoryBySlug(slug) {
  const category = await prisma.category.findUnique({
    where: { slug },
    include: {
      products: {
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          slug: true,
          sku: true,
          images: true,
          inStock: true,
          leadTime: true,
          isFeatured: true,
        },
      },
    },
  });

  if (!category) {
    throw new AppError(404, "Category not found", "category_not_found");
  }

  return category;
}

export async function getCategoryById(categoryId) {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: {
      _count: {
        select: { products: { where: { isActive: true } } },
      },
    },
  });

  if (!category) {
    throw new AppError(404, "Category not found", "category_not_found");
  }

  return category;
}

export async function createCategory(input, actor) {
  const slug = input.slug || slugify(input.name);

  const existing = await prisma.category.findFirst({
    where: { OR: [{ name: input.name }, { slug }] },
  });

  if (existing) {
    throw new AppError(409, "A category with that name or slug already exists", "conflict");
  }

  const prefix = deriveCategoryPrefix(input.name, slug, input.description);
  const rawDesc = (input.description || "").trim();
  const formattedDescription = /Prefix:\s*[A-Z0-9]{3}/i.test(rawDesc)
    ? rawDesc
    : rawDesc
      ? `${rawDesc} (Prefix: ${prefix})`
      : `Clinical surgical equipment category for ${input.name}. (Prefix: ${prefix})`;

  const category = await prisma.category.create({
    data: {
      name: input.name,
      slug,
      description: formattedDescription,
      imageUrl: input.imageUrl,
      icon: input.icon || prefix,
      displayOrder: input.displayOrder,
      isActive: input.isActive ?? true,
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorRole: actor.role,
      action: "CREATE_CATEGORY",
      entityType: "category",
      entityId: category.id,
      metadata: { name: category.name, slug: category.slug },
    },
  });

  // Invalidate categories cache
  await cacheInvalidatePattern("categories:");

  return category;
}

export async function updateCategory(categoryId, input, actor) {
  const existing = await prisma.category.findUnique({
    where: { id: categoryId },
  });

  if (!existing) {
    throw new AppError(404, "Category not found", "category_not_found");
  }

  const slug = input.slug ? slugify(input.slug) : input.name ? slugify(input.name) : undefined;

  const category = await prisma.category.update({
    where: { id: categoryId },
    data: {
      ...input,
      ...(slug ? { slug } : {}),
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorRole: actor.role,
      action: "UPDATE_CATEGORY",
      entityType: "category",
      entityId: category.id,
      metadata: input,
    },
  });

  // Invalidate categories cache
  await cacheInvalidatePattern("categories:");

  return category;
}

export async function deleteCategory(categoryId, actor) {
  const productsCount = await prisma.product.count({
    where: { categoryId },
  });

  if (productsCount > 0) {
    throw new AppError(
      400,
      `Cannot delete category: ${productsCount} products are assigned to it. Reassign or remove them first.`,
      "category_in_use"
    );
  }

  const category = await prisma.category.delete({
    where: { id: categoryId },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorRole: actor.role,
      action: "DELETE_CATEGORY",
      entityType: "category",
      entityId: category.id,
      metadata: { name: category.name },
    },
  });

  // Invalidate categories cache
  await cacheInvalidatePattern("categories:");

  return category;
}
