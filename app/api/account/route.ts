import { NextResponse } from "next/server";

import { json, unauthorized } from "@/lib/api";
import { getSessionUser } from "@/lib/auth/session";
import { DEMO_COOKIE } from "@/lib/config/demo";
import { prisma } from "@/lib/db/prisma";
import { removePrefix } from "@/lib/storage/photos";

/** GDPR export: everything stored about the signed-in user, as JSON. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const data = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      settings: true,
      analyses: true,
      batches: true,
      watchlist: true,
      deals: true,
      ledger: true,
    },
  });
  return json(
    { exportedAt: new Date().toISOString(), user: { ...data, apiTokenHash: data?.apiTokenHash ? "[set]" : null } },
    { headers: { "content-disposition": `attachment; filename="auctionpulse-export.json"` } },
  );
}

/** Permanently deletes the account and its data (uploads included). */
export async function DELETE() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (user.isDemo) return NextResponse.json({ error: "The shared demo account can't be deleted." }, { status: 400 });
  await removePrefix(`uploads/${user.id.replace(/[^\w-]/g, "")}`).catch(() => undefined);
  await prisma.user.delete({ where: { id: user.id } });
  const res = json({ ok: true });
  res.cookies.delete(DEMO_COOKIE);
  return res;
}
