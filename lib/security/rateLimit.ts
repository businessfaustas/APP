import "server-only";

import { prisma } from "@/lib/db/prisma";
import { log } from "@/lib/observability/log";

export interface LimitResult {
  ok: boolean;
  remaining: number;
  /** Seconds until a blocked caller may try again. */
  retryAfter: number;
}

/** Best-effort client address behind Vercel's proxy (first hop of x-forwarded-for). */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || req.headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Fixed-window limiter backed by the database, so it holds across serverless instances. The hit
 * is recorded before counting, so simultaneous requests cannot all slip under the limit.
 * Fails open (and logs) if the database is unavailable: a limiter outage must not become an app outage.
 */
export async function rateLimit(bucket: string, id: string, max: number, windowSec: number): Promise<LimitResult> {
  const key = `${bucket}:${id}`;
  try {
    const since = new Date(Date.now() - windowSec * 1000);
    await prisma.rateLimitHit.create({ data: { key } });
    const [count, oldest] = await Promise.all([
      prisma.rateLimitHit.count({ where: { key, createdAt: { gte: since } } }),
      prisma.rateLimitHit.findFirst({ where: { key, createdAt: { gte: since } }, orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
    ]);
    if (count <= max) return { ok: true, remaining: max - count, retryAfter: 0 };
    const retryAfter = oldest ? Math.max(1, Math.ceil((oldest.createdAt.getTime() + windowSec * 1000 - Date.now()) / 1000)) : windowSec;
    return { ok: false, remaining: 0, retryAfter };
  } catch (err) {
    log.warn("ratelimit.unavailable", { bucket, err });
    return { ok: true, remaining: max, retryAfter: 0 };
  }
}
