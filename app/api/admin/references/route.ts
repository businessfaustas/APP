import { z } from "zod";

import { errorResponse, handleApiError, json } from "@/lib/api";
import { adminFromRequest } from "@/lib/auth/admin";
import { prisma } from "@/lib/db/prisma";
import { PART_SOURCES, VEHICLE_CLASSES } from "@/lib/domain/schemas";

const PriceRow = z.object({
  partKey: z.string().min(2).max(60),
  vehicleClass: z.enum(VEHICLE_CLASSES),
  source: z.enum(PART_SOURCES),
  priceLow: z.number().int().min(0).max(1_000_000),
  priceHigh: z.number().int().min(0).max(1_000_000),
});

const LaborRow = z.object({
  partKey: z.string().min(2).max(60),
  displayName: z.string().min(1).max(80),
  zone: z.string().min(1).max(30),
  category: z.string().min(1).max(30),
  bodyHoursLow: z.number().min(0).max(200),
  bodyHoursHigh: z.number().min(0).max(200),
  paintHoursLow: z.number().min(0).max(200),
  paintHoursHigh: z.number().min(0).max(200),
  mechHoursLow: z.number().min(0).max(200),
  mechHoursHigh: z.number().min(0).max(200),
});

const Body = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("prices"), rows: z.array(PriceRow).min(1).max(5000) }),
  z.object({ kind: z.literal("labor"), rows: z.array(LaborRow).min(1).max(1000) }),
]);

/** Upserts parts-price or labor reference rows (from the admin table or a CSV import). */
export async function PUT(req: Request) {
  if (!(await adminFromRequest())) return errorResponse("Admins only.", 403);
  try {
    const body = Body.parse(await req.json());
    if (body.kind === "prices") {
      for (const r of body.rows) {
        if (r.priceHigh < r.priceLow) return errorResponse(`${r.partKey}: high price is below low price`, 400);
      }
      await prisma.$transaction(
        body.rows.map((r) =>
          prisma.partPriceReference.upsert({
            where: { partKey_vehicleClass_source: { partKey: r.partKey, vehicleClass: r.vehicleClass, source: r.source } },
            create: { ...r, isPlaceholder: false },
            update: { priceLow: r.priceLow, priceHigh: r.priceHigh, isPlaceholder: false },
          }),
        ),
      );
    } else {
      await prisma.$transaction(body.rows.map((r) => prisma.laborReference.upsert({ where: { partKey: r.partKey }, create: r, update: r })));
    }
    return json({ ok: true, count: body.rows.length });
  } catch (err) {
    return handleApiError(err);
  }
}
