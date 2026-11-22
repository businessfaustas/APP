import { errorResponse, json, limited } from "@/lib/api";
import { prisma } from "@/lib/db/prisma";
import { verifyToken } from "@/lib/security/tokens";

/**
 * One-click unsubscribe (RFC 8058): mail clients POST here from the List-Unsubscribe header, and
 * the /unsubscribe page posts here too. The signed token in the link is the authorisation, so no
 * sign-in is needed. Idempotent.
 */
async function handle(req: Request, token: string | null) {
  const blocked = await limited(req, "unsubscribe", 30, 3600);
  if (blocked) return blocked;
  const userId = verifyToken("unsubscribe", token);
  if (!userId) return errorResponse("This unsubscribe link isn't valid.", 400);
  await prisma.user.updateMany({ where: { id: userId }, data: { emailOptOut: true } });
  return json({ ok: true });
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  let token = url.searchParams.get("t");
  if (!token) {
    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) token = ((await req.json().catch(() => ({}))) as { t?: string }).t ?? null;
    else token = ((await req.formData().catch(() => null))?.get("t") as string | null) ?? null;
  }
  return handle(req, token);
}
