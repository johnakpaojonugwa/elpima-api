const idempotencyCache = new Map();
const MAX_IDEMPOTENCY_KEYS = 5000;
const TTL_MS = 10 * 60 * 1000; // 10 minutes

// Periodic cleanup of keys older than 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of idempotencyCache.entries()) {
    if (now - record.timestamp > TTL_MS) {
      idempotencyCache.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

/**
 * Idempotency middleware for state-changing endpoints (e.g., POST quote request)
 * Hardened with maximum key cap and LRU eviction to prevent heap exhaustion / OOM attacks
 */
export function idempotency(request, response, nextFunction) {
  const key = request.headers["idempotency-key"];
  if (!key || typeof key !== "string" || key.length > 128) {
    return nextFunction();
  }

  const cached = idempotencyCache.get(key);
  if (cached) {
    // Return cached response with header indication
    response.setHeader("X-Cache-Lookup", "HIT-IDEMPOTENT");
    return response.status(cached.status).json(cached.body);
  }

  // Intercept json output to save to cache
  const originalJson = response.json.bind(response);
  response.json = (responseBody) => {
    if (response.statusCode >= 200 && response.statusCode < 300) {
      // Memory protection: if cache exceeds maximum allowed size, evict oldest entry
      if (idempotencyCache.size >= MAX_IDEMPOTENCY_KEYS) {
        const oldestKey = idempotencyCache.keys().next().value;
        idempotencyCache.delete(oldestKey);
      }

      idempotencyCache.set(key, {
        status: response.statusCode,
        body: responseBody,
        timestamp: Date.now(),
      });
    }
    return originalJson(responseBody);
  };

  nextFunction();
}
