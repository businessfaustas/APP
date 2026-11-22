/**
 * Per-instance burst limiter for the proxy: cheap, no database round trip. Serverless instances
 * each keep their own counters, so this only blunts floods; the accurate per-user and per-IP
 * limits live in `rateLimit()` (database-backed) and are applied by the routes themselves.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();
const MAX_KEYS = 5_000;

export function burstLimit(key: string, max: number, windowMs: number, now: number = Date.now()): { ok: boolean; retryAfter: number } {
  if (buckets.size > MAX_KEYS) for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  if (buckets.size > MAX_KEYS * 2) buckets.clear();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  b.count += 1;
  return b.count > max ? { ok: false, retryAfter: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) } : { ok: true, retryAfter: 0 };
}

export function resetBurstLimits(): void {
  buckets.clear();
}
