import { randomUUID } from "node:crypto";

/**
 * Minimal Sentry client over HTTP (the "envelope" endpoint), so error tracking works with just a
 * DSN and no SDK in the bundle. Session replay is not part of this and is never enabled.
 */
export interface SentryEventInput {
  message: string;
  name?: string;
  stack?: string;
  level?: "error" | "fatal" | "warning";
  environment?: string;
  release?: string;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  request?: { url?: string; method?: string };
}

export function parseDsn(dsn: string): { endpoint: string; key: string } | null {
  try {
    const u = new URL(dsn);
    const key = u.username;
    const projectId = u.pathname.replace(/^\/+/, "").split("/").pop();
    if (!key || !projectId) return null;
    return { endpoint: `${u.protocol}//${u.host}/api/${projectId}/envelope/?sentry_version=7&sentry_key=${encodeURIComponent(key)}`, key };
  } catch {
    return null;
  }
}

export function buildEnvelope(dsn: string, input: SentryEventInput, now: Date = new Date()): string {
  const eventId = randomUUID().replace(/-/g, "");
  const frames = (input.stack ?? "")
    .split("\n")
    .slice(1, 12)
    .map((line) => line.trim().replace(/^at\s+/, ""))
    .filter(Boolean)
    .map((fn) => ({ function: fn }))
    .reverse();
  const event = {
    event_id: eventId,
    timestamp: now.getTime() / 1000,
    platform: "node",
    level: input.level ?? "error",
    environment: input.environment,
    release: input.release,
    tags: input.tags,
    extra: input.extra,
    request: input.request,
    exception: { values: [{ type: input.name ?? "Error", value: input.message, stacktrace: frames.length ? { frames } : undefined }] },
  };
  return [JSON.stringify({ event_id: eventId, sent_at: now.toISOString(), dsn }), JSON.stringify({ type: "event" }), JSON.stringify(event)].join("\n");
}

export async function sendToSentry(dsn: string, input: SentryEventInput): Promise<boolean> {
  const parsed = parseDsn(dsn);
  if (!parsed) return false;
  try {
    const res = await fetch(parsed.endpoint, {
      method: "POST",
      headers: { "content-type": "application/x-sentry-envelope" },
      body: buildEnvelope(dsn, input),
      signal: AbortSignal.timeout(4_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
