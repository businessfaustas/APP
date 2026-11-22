import { NextResponse } from "next/server";

import { deleteAccount } from "@/lib/account/delete";
import { handleApiError, json, limited, unauthorized } from "@/lib/api";
import { getSessionUser } from "@/lib/auth/session";
import { DEMO_COOKIE } from "@/lib/config/demo";
import { prisma } from "@/lib/db/prisma";

/** GDPR export: everything stored about the signed-in user, as JSON. */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const blocked = await limited(req, "account-export", 10, 3600, user.id);
  if (blocked) return blocked;
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
    { headers: { "content-disposition": `attachment; filename="flagbid-export.json"`, "cache-control": "no-store" } },
  );
}

/** Permanently deletes the account and its data (uploads included). */
export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (user.isDemo) return NextResponse.json({ error: "The shared demo account can't be deleted." }, { status: 400 });
  const blocked = await limited(req, "account-delete", 5, 3600, user.id);
  if (blocked) return blocked;
  try {
    await deleteAccount({ id: user.id });
  } catch (err) {
    return handleApiError(err);
  }
  const res = json({ ok: true });
  res.cookies.delete(DEMO_COOKIE);
  return res;
}
