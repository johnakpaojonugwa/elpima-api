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

export async function listSpecialties() {
  return prisma.specialty.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { products: { where: { isActive: true } } },
      },
    },
  });
}

export async function getSpecialtyBySlug(slug) {
  const specialty = await prisma.specialty.findUnique({
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
          category: { select: { id: true, name: true, slug: true } },
        },
      },
    },
  });

  if (!specialty) {
    throw new AppError(404, "Surgical specialty not found", "specialty_not_found");
  }

  return specialty;
}

export async function getSpecialtyById(id) {
  const specialty = await prisma.specialty.findUnique({
    where: { id },
    include: {
      _count: {
        select: { products: { where: { isActive: true } } },
      },
    },
  });

  if (!specialty) {
    throw new AppError(404, "Surgical specialty not found", "specialty_not_found");
  }

  return specialty;
}

export async function createSpecialty(input, actor) {
  const slug = input.slug || slugify(input.name);

  const existing = await prisma.specialty.findFirst({
    where: { OR: [{ name: input.name }, { slug }] },
  });

  if (existing) {
    throw new AppError(409, "A specialty with that name or slug already exists", "conflict");
  }

  const specialty = await prisma.specialty.create({
    data: {
      name: input.name,
      slug,
      description: input.description,
      imageUrl: input.imageUrl,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorRole: actor.role,
      action: "CREATE_SPECIALTY",
      entityType: "specialty",
      entityId: specialty.id,
      metadata: { name: specialty.name, slug: specialty.slug },
    },
  });

  return specialty;
}

export async function updateSpecialty(id, input, actor) {
  const existing = await prisma.specialty.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new AppError(404, "Surgical specialty not found", "specialty_not_found");
  }

  const slug = input.slug ? slugify(input.slug) : input.name ? slugify(input.name) : undefined;

  const specialty = await prisma.specialty.update({
    where: { id },
    data: {
      ...input,
      ...(slug ? { slug } : {}),
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorRole: actor.role,
      action: "UPDATE_SPECIALTY",
      entityType: "specialty",
      entityId: specialty.id,
      metadata: input,
    },
  });

  return specialty;
}

export async function deleteSpecialty(id, actor) {
  const productsCount = await prisma.product.count({
    where: { specialtyId: id },
  });

  if (productsCount > 0) {
    throw new AppError(
      400,
      `Cannot delete specialty: ${productsCount} products are tagged with it. Reassign them first.`,
      "specialty_in_use"
    );
  }

  const specialty = await prisma.specialty.delete({
    where: { id },
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorRole: actor.role,
      action: "DELETE_SPECIALTY",
      entityType: "specialty",
      entityId: specialty.id,
      metadata: { name: specialty.name },
    },
  });

  return specialty;
}
