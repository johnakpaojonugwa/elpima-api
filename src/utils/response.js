/**
 * Standard API response wrapper
 */
export function successResponse(response, { statusCode = 200, data = null, message = "Success", meta = null }) {
  const payload = {
    success: true,
    message,
    data,
  };

  if (meta) {
    payload.meta = meta;
  }

  return response.status(statusCode).json(payload);
}

/**
 * Standard paginated response helper
 */
export function paginatedResponse(response, { data, total, page, limit, message = "Records retrieved successfully" }) {
  const totalPages = Math.ceil(total / limit) || 1;
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  return response.status(200).json({
    success: true,
    message,
    data,
    meta: {
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
    },
  });
}
