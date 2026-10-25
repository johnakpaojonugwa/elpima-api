import * as specialtyService from "./service.js";
import { successResponse } from "../../utils/response.js";

export async function listSpecialties(_request, response, nextFunction) {
  try {
    const specialties = await specialtyService.listSpecialties();
    return successResponse(response, {
      message: "Surgical specialties retrieved successfully",
      data: specialties,
    });
  } catch (error) {
    nextFunction(error);
  }
}

export async function getSpecialtyBySlug(request, response, nextFunction) {
  try {
    const specialty = await specialtyService.getSpecialtyBySlug(request.params.slug);
    return successResponse(response, {
      message: "Surgical specialty retrieved successfully",
      data: specialty,
    });
  } catch (error) {
    nextFunction(error);
  }
}

export async function getSpecialtyById(request, response, nextFunction) {
  try {
    const specialty = await specialtyService.getSpecialtyById(request.params.id);
    return successResponse(response, {
      message: "Surgical specialty retrieved successfully",
      data: specialty,
    });
  } catch (error) {
    nextFunction(error);
  }
}

export async function createSpecialty(request, response, nextFunction) {
  try {
    const specialty = await specialtyService.createSpecialty(request.body, request.user);
    return successResponse(response, {
      statusCode: 201,
      message: "Surgical specialty created successfully",
      data: specialty,
    });
  } catch (error) {
    nextFunction(error);
  }
}

export async function updateSpecialty(request, response, nextFunction) {
  try {
    const specialty = await specialtyService.updateSpecialty(request.params.id, request.body, request.user);
    return successResponse(response, {
      message: "Surgical specialty updated successfully",
      data: specialty,
    });
  } catch (error) {
    nextFunction(error);
  }
}

export async function deleteSpecialty(request, response, nextFunction) {
  try {
    await specialtyService.deleteSpecialty(request.params.id, request.user);
    return successResponse(response, {
      message: "Surgical specialty deleted successfully",
    });
  } catch (error) {
    nextFunction(error);
  }
}
