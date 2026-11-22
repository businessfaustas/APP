import { z } from "zod";

import { errorResponse, handleApiError, json, limited, unauthorized } from "@/lib/api";
import { getSessionUser } from "@/lib/auth/session";
import { legalConfig } from "@/lib/config/legal";
import { prisma } from "@/lib/db/prisma";

const Body = z.object({
  ageConfirmed: z.literal(true),
  termsAccepted: z.literal(true),
});

/**
 * Records that the signed-in user is 18 or older and accepted the Terms and Privacy Policy.
 * Required before the app opens (see requireUser); the date and the version they accepted are stored.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const blocked = await limited(req, "consent", 20, 3600, user.id);
  if (blocked) return blocked;
  try {
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return errorResponse("You need to confirm you are 18 or older and accept the Terms and Privacy Policy.", 400);
    const now = new Date();
    await prisma.user.update({ where: { id: user.id }, data: { ageConfirmedAt: now, termsAcceptedAt: now, termsVersion: legalConfig().termsVersion } });
    return json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
