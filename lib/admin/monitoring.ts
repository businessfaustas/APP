import "server-only";

import { aiSpend } from "@/lib/ai/budget";
import { prisma } from "@/lib/db/prisma";

/** Everything the Admin › Monitoring page shows, gathered in one place. */
export async function monitoringSnapshot(now: Date = new Date()) {
  const since7 = new Date(now.getTime() - 7 * 86_400_000);
  const since24 = new Date(now.getTime() - 86_400_000);
  const sinceHour = new Date(now.getTime() - 3_600_000);
  const [errors, errors24, spend, vitals, events, topPages, limitHits, stripeEvents] = await Promise.all([
    prisma.errorGroup.findMany({ where: { resolved: false }, orderBy: { lastSeen: "desc" }, take: 15 }),
    prisma.errorGroup.count({ where: { lastSeen: { gte: since24 } } }),
    aiSpend(now),
    prisma.$queryRaw<{ name: string; p75: number; samples: bigint }[]>`
      SELECT name, percentile_cont(0.75) WITHIN GROUP (ORDER BY value) AS p75, count(*) AS samples
      FROM "WebVital" WHERE "createdAt" >= ${since7} GROUP BY name`,
    prisma.analyticsEvent.groupBy({ by: ["name"], where: { createdAt: { gte: since7 } }, _count: { _all: true }, orderBy: { _count: { name: "desc" } } }),
    prisma.analyticsEvent.groupBy({
      by: ["path"],
      where: { name: "page_view", createdAt: { gte: since7 } },
      _count: { _all: true },
      orderBy: { _count: { path: "desc" } },
      take: 8,
    }),
    prisma.rateLimitHit.count({ where: { createdAt: { gte: sinceHour } } }),
    prisma.stripeEvent.count({ where: { createdAt: { gte: since24 } } }),
  ]);
  return { errors, errors24, spend, vitals, events, topPages, limitHits, stripeEvents };
}
