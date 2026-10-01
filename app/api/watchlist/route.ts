import { z } from "zod";

import { errorResponse, handleApiError, json, notFound, unauthorized } from "@/lib/api";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

const AddSchema = z.object({
  analysisId: z.string().min(1).max(40),
  notes: z.string().max(1000).nullish(),
  myMaxBid: z.number().int().min(0).max(10_000_000).nullish(),
  remindMinutesBefore: z.number().int().min(0).max(60 * 24 * 7).nullish(),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const body = AddSchema.parse(await req.json());
    const a = await prisma.analysis.findFirst({ where: { id: body.analysisId, userId: user.id }, include: { listing: true } });
    if (!a?.listingId || !a.listing) return errorResponse("This analysis has no listing to watch yet.", 400);
    const minutes = body.remindMinutesBefore ?? 120;
    const remindAt = a.listing.saleDate ? new Date(a.listing.saleDate.getTime() - minutes * 60_000) : null;
    const item = await prisma.watchlistItem.upsert({
      where: { userId_listingId: { userId: user.id, listingId: a.listingId } },
      create: { userId: user.id, listingId: a.listingId, analysisId: a.id, notes: body.notes ?? null, myMaxBid: body.myMaxBid ?? a.maxBid, remindAt },
      update: { analysisId: a.id, notes: body.notes ?? undefined, myMaxBid: body.myMaxBid ?? undefined, remindAt, remindedAt: null },
    });
    return json({ item }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

const PatchSchema = z.object({
  id: z.string().min(1).max(40),
  notes: z.string().max(1000).nullish(),
  myMaxBid: z.number().int().min(0).max(10_000_000).nullish(),
});

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const body = PatchSchema.parse(await req.json());
    const res = await prisma.watchlistItem.updateMany({
      where: { id: body.id, userId: user.id },
      data: { notes: body.notes ?? undefined, myMaxBid: body.myMaxBid ?? undefined },
    });
    if (res.count === 0) return notFound();
    return json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const analysisId = url.searchParams.get("analysisId");
  if (id) {
    await prisma.watchlistItem.deleteMany({ where: { id, userId: user.id } });
  } else if (analysisId) {
    const a = await prisma.analysis.findFirst({ where: { id: analysisId, userId: user.id }, select: { listingId: true } });
    if (a?.listingId) await prisma.watchlistItem.deleteMany({ where: { userId: user.id, listingId: a.listingId } });
  } else {
    return errorResponse("id or analysisId required", 400);
  }
  return json({ ok: true });
}
