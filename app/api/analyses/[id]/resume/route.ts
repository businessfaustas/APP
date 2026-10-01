import { z } from "zod";

import { resumeAnalysis } from "@/lib/analysis/create";
import { handleApiError, json, unauthorized } from "@/lib/api";
import { getSessionUser } from "@/lib/auth/session";
import { ManualListingSchema } from "@/lib/pipeline/types";

const ResumeSchema = z.object({
  text: z.string().max(60_000).nullish(),
  manual: ManualListingSchema.nullish(),
  photos: z.array(z.string().max(300)).max(40).default([]),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await params;
  try {
    const body = ResumeSchema.parse(await req.json());
    await resumeAnalysis(user, id, { text: body.text ?? null, manual: body.manual ?? null, photos: body.photos });
    return json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
