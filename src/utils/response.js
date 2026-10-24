/**
 * Standard API response wrapper
 */
export function successResponse(res, { statusCode = 200, data = null, message = "Success", meta = null }) {
  const payload = {
    success: true,
    message,
    data,
  };

  if (meta) {
    payload.meta = meta;
  }

  return res.status(statusCode).json(payload);
}

/**
 * Standard paginated response helper
 */
export function paginatedResponse(res, { data, total, page, limit, message = "Records retrieved successfully" }) {
  const totalPages = Math.ceil(total / limit) || 1;
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return res.status(200).json({
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
        hasPrevPage,
      },
    },
  });
}
