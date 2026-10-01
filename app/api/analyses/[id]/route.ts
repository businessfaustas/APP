import { z } from "zod";

import { UserOverridesSchema } from "@/lib/analysis/overrides";
import { getAnalysisView } from "@/lib/analysis/view";
import { handleApiError, json, notFound, unauthorized } from "@/lib/api";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const view = await getAnalysisView(id, { userId: user.id });
  if (!view) return notFound();
  return json(view, { headers: { "cache-control": "no-store" } });
}

const PatchSchema = z.object({ userOverrides: UserOverridesSchema });

export async function PATCH(req: Request, { params }: Ctx) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await params;
  try {
    const body = PatchSchema.parse(await req.json());
    const res = await prisma.analysis.updateMany({
      where: { id, userId: user.id },
      data: { userOverrides: body.userOverrides as unknown as Prisma.InputJsonValue },
    });
    if (res.count === 0) return notFound();
    return json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const res = await prisma.analysis.deleteMany({ where: { id, userId: user.id } });
  if (res.count === 0) return notFound();
  return json({ ok: true });
}
