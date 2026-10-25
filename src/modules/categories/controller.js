import * as categoryService from "./service.js";
import { successResponse } from "../../utils/response.js";

export async function listCategories(request, response, nextFunction) {
  try {
    const includeInactive = request.query.includeInactive === "true" && request.user;
    const categories = await categoryService.listCategories({ includeInactive });
    return successResponse(response, {
      message: "Categories retrieved successfully",
      data: categories,
    });
  } catch (error) {
    nextFunction(error);
  }
}

export async function getCategoryBySlug(request, response, nextFunction) {
  try {
    const category = await categoryService.getCategoryBySlug(request.params.slug);
    return successResponse(response, {
      message: "Category retrieved successfully",
      data: category,
    });
  } catch (error) {
    nextFunction(error);
  }
}

export async function getCategoryById(request, response, nextFunction) {
  try {
    const category = await categoryService.getCategoryById(request.params.id);
    return successResponse(response, {
      message: "Category retrieved successfully",
      data: category,
    });
  } catch (error) {
    nextFunction(error);
  }
}

export async function createCategory(request, response, nextFunction) {
  try {
    const category = await categoryService.createCategory(request.body, request.user);
    return successResponse(response, {
      statusCode: 201,
      message: "Category created successfully",
      data: category,
    });
  } catch (error) {
    nextFunction(error);
  }
}

export async function updateCategory(request, response, nextFunction) {
  try {
    const category = await categoryService.updateCategory(request.params.id, request.body, request.user);
    return successResponse(response, {
      message: "Category updated successfully",
      data: category,
    });
  } catch (error) {
    nextFunction(error);
  }
}

export async function deleteCategory(request, response, nextFunction) {
  try {
    await categoryService.deleteCategory(request.params.id, request.user);
    return successResponse(response, {
      message: "Category deleted successfully",
    });
  } catch (error) {
    nextFunction(error);
  }
}
