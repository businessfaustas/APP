import { z } from "zod";

import { json, limited } from "@/lib/api";
import { prisma } from "@/lib/db/prisma";
import { log } from "@/lib/observability/log";
import { analyticsAllowed } from "@/lib/privacy/consent";

const Body = z.object({
  name: z.enum(["LCP", "INP", "CLS", "FCP", "TTFB"]),
  value: z.number().finite().min(0).max(120_000),
  rating: z.enum(["good", "needs-improvement", "poor"]),
  path: z.string().max(200).startsWith("/"),
  device: z.enum(["mobile", "desktop"]).default("desktop"),
});

/** Core Web Vitals beacon. Anonymous; stored only when the visitor allowed analytics. */
export async function POST(req: Request) {
  if (!analyticsAllowed(req.headers.get("cookie"))) return new Response(null, { status: 204 });
  const blocked = await limited(req, "vitals", 60, 60);
  if (blocked) return blocked;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Bad request." }, { status: 400 });
  try {
    await prisma.webVital.create({ data: { ...parsed.data, path: parsed.data.path.split("?")[0]!.replace(/\/[0-9a-z]{20,}/gi, "/:id") } });
  } catch (err) {
    // A page-speed beacon is not worth an error alert: if the database is busy, drop this one reading.
    log.warn("vitals.store_failed", { reason: err instanceof Error ? err.message.slice(0, 160) : "unknown" });
  }
  return new Response(null, { status: 204 });
}
