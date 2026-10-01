import { z } from "zod";

import { errorResponse, handleApiError, json, notFound } from "@/lib/api";
import { adminFromRequest } from "@/lib/auth/admin";
import { validateFeeSchedule } from "@/lib/calc/fees";
import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";

const Tier = z
  .object({
    min: z.number().min(0),
    max: z.number().nullable(),
    amount: z.number().min(0).optional(),
    bps: z.number().int().min(0).max(10000).optional(),
    minAmount: z.number().min(0).optional(),
  })
  .strict();

const Body = z.object({
  id: z.string().max(40).optional(),
  source: z.enum(["COPART", "IAAI"]),
  buyerType: z.enum(["LICENSED_DEALER", "PUBLIC_VIA_BROKER"]),
  name: z.string().min(1).max(120),
  buyerFeeTiers: z.array(Tier).max(60),
  onlineBidFeeTiers: z.array(Tier).max(60),
  fixedFees: z.array(z.object({ label: z.string().min(1).max(60), amount: z.number().min(0) })).max(20),
  isPlaceholder: z.boolean(),
  sourceUrl: z.string().url().max(500).nullable(),
  verifiedAt: z.string().max(40).nullable(),
  active: z.boolean(),
});

export async function PUT(req: Request) {
  if (!(await adminFromRequest())) return errorResponse("Admins only.", 403);
  try {
    const b = Body.parse(await req.json());
    const check = validateFeeSchedule(b);
    if (!check.ok) return errorResponse(check.errors.join("; "), 400);
    const data = {
      source: b.source,
      buyerType: b.buyerType,
      name: b.name,
      buyerFeeTiers: b.buyerFeeTiers as unknown as Prisma.InputJsonValue,
      onlineBidFeeTiers: b.onlineBidFeeTiers as unknown as Prisma.InputJsonValue,
      fixedFees: b.fixedFees as unknown as Prisma.InputJsonValue,
      isPlaceholder: b.isPlaceholder,
      sourceUrl: b.sourceUrl,
      verifiedAt: b.verifiedAt ? new Date(b.verifiedAt) : null,
      active: b.active,
    };
    if (b.active) {
      await prisma.feeSchedule.updateMany({ where: { source: b.source, buyerType: b.buyerType, id: b.id ? { not: b.id } : undefined }, data: { active: false } });
    }
    const row = b.id ? await prisma.feeSchedule.update({ where: { id: b.id }, data }) : await prisma.feeSchedule.create({ data });
    return json({ schedule: row });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: Request) {
  if (!(await adminFromRequest())) return errorResponse("Admins only.", 403);
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return notFound();
  await prisma.feeSchedule.delete({ where: { id } }).catch(() => undefined);
  return json({ ok: true });
}
