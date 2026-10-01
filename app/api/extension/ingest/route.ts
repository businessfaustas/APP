import { createAnalysis } from "@/lib/analysis/create";
import { handleApiError, json, unauthorized } from "@/lib/api";
import { userFromBearer } from "@/lib/auth/session";
import { env } from "@/lib/config/env";
import { ExtensionCaptureSchema } from "@/lib/pipeline/types";

export const runtime = "nodejs";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "authorization, content-type",
  "access-control-max-age": "86400",
};

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

/** Browser extension: the user's own lot page (text, JSON-LD, image URLs) → new analysis. */
export async function POST(req: Request) {
  const user = await userFromBearer(req.headers.get("authorization"));
  if (!user) {
    const res = unauthorized();
    for (const [k, v] of Object.entries(CORS)) res.headers.set(k, v);
    return res;
  }
  try {
    const capture = ExtensionCaptureSchema.parse(await req.json());
    const { id } = await createAnalysis(user, { input: capture.url, mode: "EXTENSION", extension: capture });
    return json({ id, url: `${env().NEXT_PUBLIC_APP_URL}/app/analyses/${id}` }, { status: 201, headers: CORS });
  } catch (err) {
    const res = handleApiError(err);
    for (const [k, v] of Object.entries(CORS)) res.headers.set(k, v);
    return res;
  }
}
