import { z } from "zod";

import { errorResponse, handleApiError, json, limited, unauthorized } from "@/lib/api";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { EXPORT_COUNTRIES } from "@/lib/geo/countries";
import { deriveSettings, BROKER_FEE_MAX } from "@/lib/setup/derive";

const Body = z.object({
  resale: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("US"), homeZip: z.string().regex(/^\d{5}$/, "Enter a 5-digit US ZIP") }),
    z.object({ kind: z.literal("EXPORT"), country: z.enum(EXPORT_COUNTRIES) }),
  ]),
  hasVatNumber: z.boolean().default(false),
  hasLicence: z.boolean(),
  brokerFee: z.number().int().min(0).max(BROKER_FEE_MAX).optional(),
});

/** The one-time setup: three answers become the buyer's starting settings, and the setup is marked done. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const blocked = await limited(req, "setup", 30, 3600, user.id);
  if (blocked) return blocked;
  try {
    const answers = Body.parse(await req.json());
    const profiles = await prisma.exportProfile.findMany({ select: { id: true, countryCode: true } });
    const derived = deriveSettings(answers, profiles);
    if ("error" in derived) return errorResponse("That country can't be priced yet. Choose another, or the USA.", 400);
    const settings = await prisma.userSettings.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...derived, onboardedAt: new Date() },
      update: { ...derived, onboardedAt: new Date() },
    });
    return json({ ok: true, settings });
  } catch (err) {
    return handleApiError(err);
  }
}
