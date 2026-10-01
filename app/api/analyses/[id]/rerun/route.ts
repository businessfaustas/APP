import { createAnalysis } from "@/lib/analysis/create";
import { handleApiError, json, notFound, unauthorized } from "@/lib/api";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { InputPayloadSchema } from "@/lib/pipeline/types";

/** Starts a fresh analysis with the same input (re-fetches the listing, re-runs every step). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const a = await prisma.analysis.findFirst({ where: { id, userId: user.id } });
  if (!a) return notFound();
  try {
    const p = InputPayloadSchema.parse(a.inputPayload);
    if (a.listingId) await prisma.listing.update({ where: { id: a.listingId }, data: { fetchedAt: new Date(0) } }).catch(() => undefined);
    const input = p.text ?? p.parsed.url ?? p.parsed.vin ?? "";
    const { id: newId } = await createAnalysis(user, {
      input,
      mode: p.parsed.type === "EXTENSION" ? "EXTENSION" : p.parsed.type === "MANUAL" ? "MANUAL" : "auto",
      manual: p.manual,
      photos: p.photos,
      extension: p.extension,
      url: p.parsed.url,
    });
    return json({ id: newId }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
