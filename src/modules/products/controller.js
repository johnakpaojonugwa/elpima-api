import * as productService from "./service.js";
import { successResponse, paginatedResponse } from "../../utils/response.js";

export async function listProducts(request, response, nextFunction) {
  try {
    const includeInactive = request.query.includeInactive === "true" && request.user;
    const { total, page, limit, products } = await productService.listProducts({
      ...request.query,
      includeInactive,
    });

    return paginatedResponse(response, {
      data: products,
      total,
      page,
      limit,
      message: "Products retrieved successfully",
    });
  } catch (error) {
    nextFunction(error);
  }
}

export async function getProductBySlug(request, response, nextFunction) {
  try {
    const product = await productService.getProductBySlug(request.params.slug);
    return successResponse(response, {
      message: "Product retrieved successfully",
      data: product,
    });
  } catch (error) {
    nextFunction(error);
  }
}

export async function createProduct(request, response, nextFunction) {
  try {
    const clientInfo = { ip: request.ip, userAgent: request.headers["user-agent"] };
    const product = await productService.createProduct(request.body, request.user, clientInfo);
    return successResponse(response, {
      statusCode: 201,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    nextFunction(error);
  }
}

export async function updateProduct(request, response, nextFunction) {
  try {
    const clientInfo = { ip: request.ip, userAgent: request.headers["user-agent"] };
    const product = await productService.updateProduct(request.params.id, request.body, request.user, clientInfo);
    return successResponse(response, {
      message: "Product updated successfully",
      data: product,
    });
  } catch (error) {
    nextFunction(error);
  }
}

export async function toggleStock(request, response, nextFunction) {
  try {
    const clientInfo = { ip: request.ip, userAgent: request.headers["user-agent"] };
    const product = await productService.toggleStock(request.params.id, request.body, request.user, clientInfo);
    return successResponse(response, {
      message: "Product stock updated successfully",
      data: product,
    });
  } catch (error) {
    nextFunction(error);
  }
}

export async function deleteProduct(request, response, nextFunction) {
  try {
    const clientInfo = { ip: request.ip, userAgent: request.headers["user-agent"] };
    await productService.deleteProduct(request.params.id, request.user, clientInfo);
    return successResponse(response, {
      message: "Product deactivated successfully",
    });
  } catch (error) {
    nextFunction(error);
  }
}

export async function getProductById(request, response, nextFunction) {
  try {
    const product = await productService.getProductById(request.params.id);
    return successResponse(response, {
      message: "Product retrieved successfully",
      data: product,
    });
  } catch (error) {
    nextFunction(error);
  }
}

export async function getRelatedProducts(request, response, nextFunction) {
  try {
    const limit = Number(request.query.limit) || 4;
    const related = await productService.getRelatedProducts(request.params.slug, limit);
    return successResponse(response, {
      message: "Related products retrieved successfully",
      data: related,
    });
  } catch (error) {
    nextFunction(error);
  }
}
