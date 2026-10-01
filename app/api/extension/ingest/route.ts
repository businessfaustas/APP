import { createAnalysis } from "@/lib/analysis/create";
import { handleApiError, json, unauthorized } from "@/lib/api";
import { userFromBearer } from "@/lib/auth/session";
import { env } from "@/lib/config/env";
import { ExtensionCaptureSchema } from "@/lib/pipeline/types";

export const runtime = "nodejs";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "authorization, content-type",
  "access-control-max-age": "86400",
};

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

function withCors<T extends Response>(res: T): T {
  for (const [k, v] of Object.entries(CORS)) res.headers.set(k, v);
  return res;
}

/** Extension "test connection": validates the token and reports the plan and credits. */
export async function GET(req: Request) {
  const user = await userFromBearer(req.headers.get("authorization"));
  if (!user) return withCors(unauthorized());
  return withCors(json({ ok: true, plan: user.plan, creditsRemaining: user.creditsRemaining }));
}

/** Browser extension: the user's own lot page (text, JSON-LD, image URLs) → new analysis. */
export async function POST(req: Request) {
  const user = await userFromBearer(req.headers.get("authorization"));
  if (!user) return withCors(unauthorized());
  try {
    const capture = ExtensionCaptureSchema.parse(await req.json());
    const { id } = await createAnalysis(user, { input: capture.url, mode: "EXTENSION", extension: capture });
    return json({ id, url: `${env().NEXT_PUBLIC_APP_URL}/app/analyses/${id}` }, { status: 201, headers: CORS });
  } catch (err) {
    return withCors(handleApiError(err));
  }
}
