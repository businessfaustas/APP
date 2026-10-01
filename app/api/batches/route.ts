import { z } from "zod";

import { createAnalysis } from "@/lib/analysis/create";
import { handleApiError, json, unauthorized } from "@/lib/api";
import { getSessionUser } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/billing/credits";
import { RATE_LIMITS } from "@/lib/billing/plans";
import { prisma } from "@/lib/db/prisma";

const BatchSchema = z.object({
  name: z.string().max(80).nullish(),
  inputs: z.array(z.string().min(5).max(2000)).min(1).max(RATE_LIMITS.batchMax),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const body = BatchSchema.parse(await req.json());
    const inputs = [...new Set(body.inputs.map((s) => s.trim()).filter(Boolean))];
    await checkRateLimit(user.id, inputs.length);
    const batch = await prisma.batch.create({ data: { userId: user.id, name: body.name ?? null } });
    const created: { input: string; id: string | null; error: string | null }[] = [];
    for (const input of inputs) {
      try {
        const { id } = await createAnalysis(user, { input, batchId: batch.id }, { skipRateLimit: true });
        created.push({ input, id, error: null });
      } catch (err) {
        created.push({ input, id: null, error: err instanceof Error ? err.message : "Failed" });
      }
    }
    return json({ batchId: batch.id, analyses: created }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
