export function createRateLimiter({ windowMs = 15 * 60 * 1000, maxRequests = 10 } = {}) {
  const hits = new Map();

  return function check(identifier) {
    const now = Date.now();
    const entry = hits.get(identifier);

    if (!entry) {
      hits.set(identifier, { count: 1, resetAt: now + windowMs });
      return { ok: true, remaining: maxRequests - 1, resetAt: now + windowMs };
    }

    if (now > entry.resetAt) {
      hits.set(identifier, { count: 1, resetAt: now + windowMs });
      return { ok: true, remaining: maxRequests - 1, resetAt: now + windowMs };
    }

    if (entry.count >= maxRequests) {
      return { ok: false, remaining: 0, resetAt: entry.resetAt };
    }

    entry.count += 1;
    return { ok: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt };
  };
}
