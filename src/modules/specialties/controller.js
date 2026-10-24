import * as specialtyService from "./service.js";
import { successResponse } from "../../utils/response.js";

export async function listSpecialties(_req, res, next) {
  try {
    const specialties = await specialtyService.listSpecialties();
    return successResponse(res, {
      message: "Surgical specialties retrieved successfully",
      data: specialties,
    });
  } catch (error) {
    next(error);
  }
}

export async function getSpecialtyBySlug(req, res, next) {
  try {
    const specialty = await specialtyService.getSpecialtyBySlug(req.params.slug);
    return successResponse(res, {
      message: "Surgical specialty retrieved successfully",
      data: specialty,
    });
  } catch (error) {
    next(error);
  }
}

export async function getSpecialtyById(req, res, next) {
  try {
    const specialty = await specialtyService.getSpecialtyById(req.params.id);
    return successResponse(res, {
      message: "Surgical specialty retrieved successfully",
      data: specialty,
    });
  } catch (error) {
    next(error);
  }
}

export async function createSpecialty(req, res, next) {
  try {
    const specialty = await specialtyService.createSpecialty(req.body, req.user);
    return successResponse(res, {
      statusCode: 201,
      message: "Surgical specialty created successfully",
      data: specialty,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateSpecialty(req, res, next) {
  try {
    const specialty = await specialtyService.updateSpecialty(req.params.id, req.body, req.user);
    return successResponse(res, {
      message: "Surgical specialty updated successfully",
      data: specialty,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteSpecialty(req, res, next) {
  try {
    await specialtyService.deleteSpecialty(req.params.id, req.user);
    return successResponse(res, {
      message: "Surgical specialty deleted successfully",
    });
  } catch (error) {
    next(error);
  }
}
