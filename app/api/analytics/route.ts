import { z } from "zod";

import { json, limited } from "@/lib/api";
import { prisma } from "@/lib/db/prisma";
import { analyticsAllowed } from "@/lib/privacy/consent";
import { ANALYTICS_EVENTS } from "@/lib/privacy/events";

const Body = z.object({
  name: z.enum(ANALYTICS_EVENTS),
  path: z.string().max(200).startsWith("/"),
  props: z.record(z.string().max(40), z.union([z.string().max(60), z.number(), z.boolean()])).optional(),
});

/** Product analytics beacon. Anonymous (no user id, IP or cookie stored); only when the visitor opted in. */
export async function POST(req: Request) {
  if (!analyticsAllowed(req.headers.get("cookie"))) return new Response(null, { status: 204 });
  const blocked = await limited(req, "analytics", 120, 60);
  if (blocked) return blocked;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Bad request." }, { status: 400 });
  const { name, path, props } = parsed.data;
  await prisma.analyticsEvent.create({ data: { name, path: path.split("?")[0]!.replace(/\/[0-9a-z]{20,}/gi, "/:id"), props: props ?? undefined } });
  return new Response(null, { status: 204 });
}
