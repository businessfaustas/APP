import { randomBytes } from "node:crypto";

import { json, notFound, unauthorized } from "@/lib/api";
import { getSessionUser } from "@/lib/auth/session";
import { env } from "@/lib/config/env";
import { prisma } from "@/lib/db/prisma";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Ctx) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const a = await prisma.analysis.findFirst({ where: { id, userId: user.id }, select: { shareToken: true, status: true } });
  if (!a) return notFound();
  const token = a.shareToken ?? randomBytes(18).toString("base64url");
  if (!a.shareToken) await prisma.analysis.update({ where: { id }, data: { shareToken: token } });
  return json({ token, url: `${env().NEXT_PUBLIC_APP_URL}/r/${token}` });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const res = await prisma.analysis.updateMany({ where: { id, userId: user.id }, data: { shareToken: null } });
  if (res.count === 0) return notFound();
  return json({ ok: true });
}
