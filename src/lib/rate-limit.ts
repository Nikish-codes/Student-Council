/**
 * Tiny in-memory sliding-window rate limiter. Process-local (fine for a single
 * instance; swap for Redis/Upstash if you scale horizontally). Used to throttle
 * abuse on public mutation endpoints.
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  limit = 10,
  windowMs = 60_000,
): { ok: boolean; remaining: number; retryAfter: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }
  b.count += 1;
  if (b.count > limit) {
    return { ok: false, remaining: 0, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
  }
  return { ok: true, remaining: limit - b.count, retryAfter: 0 };
}

/** Best-effort client IP from forwarded headers. */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

// Periodic cleanup so the map can't grow unbounded.
if (typeof setInterval !== "undefined") {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [k, b] of buckets) if (now > b.resetAt) buckets.delete(k);
  }, 5 * 60_000);
  // Don't keep the event loop alive for this.
  (timer as { unref?: () => void }).unref?.();
}
