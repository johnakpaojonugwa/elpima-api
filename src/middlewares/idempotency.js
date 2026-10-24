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
export function idempotency(req, res, next) {
  const key = req.headers["idempotency-key"];
  if (!key || typeof key !== "string" || key.length > 128) {
    return next();
  }

  const cached = idempotencyCache.get(key);
  if (cached) {
    // Return cached response with header indication
    res.setHeader("X-Cache-Lookup", "HIT-IDEMPOTENT");
    return res.status(cached.status).json(cached.body);
  }

  // Intercept json output to save to cache
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      // Memory protection: if cache exceeds maximum allowed size, evict oldest entry
      if (idempotencyCache.size >= MAX_IDEMPOTENCY_KEYS) {
        const oldestKey = idempotencyCache.keys().next().value;
        idempotencyCache.delete(oldestKey);
      }

      idempotencyCache.set(key, {
        status: res.statusCode,
        body,
        timestamp: Date.now(),
      });
    }
    return originalJson(body);
  };

  next();
}
