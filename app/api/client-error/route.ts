import { json, limited } from "@/lib/api";
import { captureError } from "@/lib/observability/errors";

export const runtime = "nodejs";

const MAX_BYTES = 10_000;
const clip = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : undefined);

/**
 * Browser error beacon: the error pages and window handlers post here so a crash on someone's
 * phone shows up in the error table (and Sentry, when configured). Anonymous, so it is rate
 * limited per IP and capped in size; it stores no cookies, user ids or request bodies.
 */
export async function POST(req: Request) {
  const blocked = await limited(req, "client-error", 20, 60);
  if (blocked) return blocked;
  const raw = await req.text();
  if (raw.length > MAX_BYTES) return json({ error: "Too large." }, { status: 413 });
  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return json({ error: "Bad request." }, { status: 400 });
  }
  const message = clip(body.message, 500);
  if (!message) return json({ error: "Bad request." }, { status: 400 });
  const err = new Error(message);
  err.name = clip(body.name, 60) ?? "ClientError";
  err.stack = clip(body.stack, 4_000);
  await captureError(err, {
    source: "client",
    path: clip(body.path, 300),
    extra: { digest: clip(body.digest, 80), ua: clip(req.headers.get("user-agent"), 160) },
  });
  return new Response(null, { status: 204 });
}
