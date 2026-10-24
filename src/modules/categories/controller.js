import * as categoryService from "./service.js";
import { successResponse } from "../../utils/response.js";

export async function listCategories(req, res, next) {
  try {
    const includeInactive = req.query.includeInactive === "true" && req.user;
    const categories = await categoryService.listCategories({ includeInactive });
    return successResponse(res, {
      message: "Categories retrieved successfully",
      data: categories,
    });
  } catch (error) {
    next(error);
  }
}

export async function getCategoryBySlug(req, res, next) {
  try {
    const category = await categoryService.getCategoryBySlug(req.params.slug);
    return successResponse(res, {
      message: "Category retrieved successfully",
      data: category,
    });
  } catch (error) {
    next(error);
  }
}

export async function getCategoryById(req, res, next) {
  try {
    const category = await categoryService.getCategoryById(req.params.id);
    return successResponse(res, {
      message: "Category retrieved successfully",
      data: category,
    });
  } catch (error) {
    next(error);
  }
}

export async function createCategory(req, res, next) {
  try {
    const category = await categoryService.createCategory(req.body, req.user);
    return successResponse(res, {
      statusCode: 201,
      message: "Category created successfully",
      data: category,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateCategory(req, res, next) {
  try {
    const category = await categoryService.updateCategory(req.params.id, req.body, req.user);
    return successResponse(res, {
      message: "Category updated successfully",
      data: category,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteCategory(req, res, next) {
  try {
    await categoryService.deleteCategory(req.params.id, req.user);
    return successResponse(res, {
      message: "Category deleted successfully",
    });
  } catch (error) {
    next(error);
  }
}
