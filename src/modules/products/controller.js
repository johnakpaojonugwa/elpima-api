import * as productService from "./service.js";
import { successResponse, paginatedResponse } from "../../utils/response.js";

export async function listProducts(req, res, next) {
  try {
    const includeInactive = req.query.includeInactive === "true" && req.user;
    const { total, page, limit, products } = await productService.listProducts({
      ...req.query,
      includeInactive,
    });

    return paginatedResponse(res, {
      data: products,
      total,
      page,
      limit,
      message: "Products retrieved successfully",
    });
  } catch (error) {
    next(error);
  }
}

export async function getProductBySlug(req, res, next) {
  try {
    const product = await productService.getProductBySlug(req.params.slug);
    return successResponse(res, {
      message: "Product retrieved successfully",
      data: product,
    });
  } catch (error) {
    next(error);
  }
}

export async function createProduct(req, res, next) {
  try {
    const clientInfo = { ip: req.ip, userAgent: req.headers["user-agent"] };
    const product = await productService.createProduct(req.body, req.user, clientInfo);
    return successResponse(res, {
      statusCode: 201,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProduct(req, res, next) {
  try {
    const clientInfo = { ip: req.ip, userAgent: req.headers["user-agent"] };
    const product = await productService.updateProduct(req.params.id, req.body, req.user, clientInfo);
    return successResponse(res, {
      message: "Product updated successfully",
      data: product,
    });
  } catch (error) {
    next(error);
  }
}

export async function toggleStock(req, res, next) {
  try {
    const clientInfo = { ip: req.ip, userAgent: req.headers["user-agent"] };
    const product = await productService.toggleStock(req.params.id, req.body, req.user, clientInfo);
    return successResponse(res, {
      message: "Product stock updated successfully",
      data: product,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteProduct(req, res, next) {
  try {
    const clientInfo = { ip: req.ip, userAgent: req.headers["user-agent"] };
    await productService.deleteProduct(req.params.id, req.user, clientInfo);
    return successResponse(res, {
      message: "Product deactivated successfully",
    });
  } catch (error) {
    next(error);
  }
}

export async function getProductById(req, res, next) {
  try {
    const product = await productService.getProductById(req.params.id);
    return successResponse(res, {
      message: "Product retrieved successfully",
      data: product,
    });
  } catch (error) {
    next(error);
  }
}

export async function getRelatedProducts(req, res, next) {
  try {
    const limit = Number(req.query.limit) || 4;
    const related = await productService.getRelatedProducts(req.params.slug, limit);
    return successResponse(res, {
      message: "Related products retrieved successfully",
      data: related,
    });
  } catch (error) {
    next(error);
  }
}
