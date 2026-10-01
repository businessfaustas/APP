import { z } from "zod";

import { createAnalysis } from "@/lib/analysis/create";
import { handleApiError, json, unauthorized } from "@/lib/api";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { ManualListingSchema } from "@/lib/pipeline/types";

const CreateSchema = z.object({
  input: z.string().max(60_000).default(""),
  mode: z.enum(["auto", "MANUAL"]).default("auto"),
  manual: ManualListingSchema.nullish(),
  photos: z.array(z.string().max(300)).max(40).default([]),
  url: z.string().url().max(2000).nullish(),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const body = CreateSchema.parse(await req.json());
    const { id } = await createAnalysis(user, {
      input: body.input,
      mode: body.mode,
      manual: body.manual ?? null,
      photos: body.photos,
      url: body.url ?? null,
    });
    return json({ id }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const url = new URL(req.url);
  const take = Math.min(50, Number(url.searchParams.get("limit") ?? 20) || 20);
  const rows = await prisma.analysis.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, status: true, verdict: true, maxBid: true, dealScore: true, createdAt: true, listingSnapshot: true, inputValue: true, progress: true },
  });
  return json({ analyses: rows });
}
