import { z } from "zod";

import { errorResponse, handleApiError, json, notFound, unauthorized } from "@/lib/api";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

const money = z.number().int().min(0).max(10_000_000).nullish();

const EntrySchema = z.object({
  analysisId: z.string().max(40).nullish(),
  vin: z.string().max(20).nullish(),
  title: z.string().min(1).max(120),
  estimatedRepair: money,
  estimatedProfit: z.number().int().min(-10_000_000).max(10_000_000).nullish(),
  purchasePrice: money,
  auctionFeesActual: money,
  transportActual: money,
  partsActual: money,
  laborActual: money,
  otherCostsActual: money,
  salePrice: money,
  purchasedAt: z.string().max(40).nullish(),
  soldAt: z.string().max(40).nullish(),
  notes: z.string().max(2000).nullish(),
});

function toData(b: z.infer<typeof EntrySchema>) {
  const date = (s: string | null | undefined) => (s ? new Date(s) : null);
  return {
    analysisId: b.analysisId ?? null,
    vin: b.vin ?? null,
    title: b.title,
    estimatedRepair: b.estimatedRepair ?? null,
    estimatedProfit: b.estimatedProfit ?? null,
    purchasePrice: b.purchasePrice ?? null,
    auctionFeesActual: b.auctionFeesActual ?? null,
    transportActual: b.transportActual ?? null,
    partsActual: b.partsActual ?? null,
    laborActual: b.laborActual ?? null,
    otherCostsActual: b.otherCostsActual ?? null,
    salePrice: b.salePrice ?? null,
    purchasedAt: date(b.purchasedAt),
    soldAt: date(b.soldAt),
    notes: b.notes ?? null,
  };
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const body = EntrySchema.parse(await req.json());
    if (body.analysisId) {
      const owns = await prisma.analysis.findFirst({ where: { id: body.analysisId, userId: user.id }, select: { id: true } });
      if (!owns) return errorResponse("Analysis not found.", 400);
    }
    const entry = await prisma.dealJournalEntry.create({ data: { userId: user.id, ...toData(body) } });
    return json({ entry }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const raw = (await req.json()) as { id?: unknown };
    const id = z.string().min(1).max(40).parse(raw.id);
    const body = EntrySchema.parse(raw);
    const res = await prisma.dealJournalEntry.updateMany({ where: { id, userId: user.id }, data: toData(body) });
    if (res.count === 0) return notFound();
    return json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return errorResponse("id required", 400);
  await prisma.dealJournalEntry.deleteMany({ where: { id, userId: user.id } });
  return json({ ok: true });
}
