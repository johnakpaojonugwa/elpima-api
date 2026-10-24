import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";

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
  const where = includeInactive ? {} : { isActive: true };

  return prisma.category.findMany({
    where,
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    include: {
      _count: {
        select: { products: { where: { isActive: true } } },
      },
    },
  });
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

export async function getCategoryById(id) {
  const category = await prisma.category.findUnique({
    where: { id },
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

  const category = await prisma.category.create({
    data: {
      name: input.name,
      slug,
      description: input.description,
      imageUrl: input.imageUrl,
      icon: input.icon,
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

  return category;
}

export async function updateCategory(id, input, actor) {
  const existing = await prisma.category.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new AppError(404, "Category not found", "category_not_found");
  }

  const slug = input.slug ? slugify(input.slug) : input.name ? slugify(input.name) : undefined;

  const category = await prisma.category.update({
    where: { id },
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

  return category;
}

export async function deleteCategory(id, actor) {
  const productsCount = await prisma.product.count({
    where: { categoryId: id },
  });

  if (productsCount > 0) {
    throw new AppError(
      400,
      `Cannot delete category: ${productsCount} products are assigned to it. Reassign or remove them first.`,
      "category_in_use"
    );
  }

  const category = await prisma.category.delete({
    where: { id },
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

  return category;
}
