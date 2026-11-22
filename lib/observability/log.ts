/**
 * Structured logging: one JSON object per line, so Vercel (or any log drain) can filter by
 * field. Secrets are redacted by key name before anything is printed.
 *
 *   log.info("analysis.completed", { analysisId, ms });
 *   log.error("stripe.webhook_failed", { eventId, err });
 */
type Level = "debug" | "info" | "warn" | "error";

const SECRET_KEY = /authorization|cookie|token|secret|password|passwd|api[-_]?key|signature|credential|service[-_]?role|dsn/i;
const MAX_STRING = 2_000;

export function redact(value: unknown, depth = 0): unknown {
  if (value == null || typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "string") return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…[${value.length - MAX_STRING} more]` : value;
  if (value instanceof Error) return { name: value.name, message: value.message, stack: value.stack?.split("\n").slice(0, 8).join("\n") };
  if (depth >= 4) return "[nested]";
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => redact(v, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = SECRET_KEY.test(k) ? "[redacted]" : redact(v, depth + 1);
    return out;
  }
  return String(value);
}

export function formatLog(level: Level, event: string, fields: Record<string, unknown> = {}): string {
  return JSON.stringify({ level, event, time: new Date().toISOString(), ...(redact(fields) as Record<string, unknown>) });
}

function emit(level: Level, event: string, fields?: Record<string, unknown>) {
  const line = formatLog(level, event, fields);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else if (level === "debug") {
    if (process.env.LOG_LEVEL === "debug") console.debug(line);
  } else console.info(line);
}

export const log = {
  debug: (event: string, fields?: Record<string, unknown>) => emit("debug", event, fields),
  info: (event: string, fields?: Record<string, unknown>) => emit("info", event, fields),
  warn: (event: string, fields?: Record<string, unknown>) => emit("warn", event, fields),
  error: (event: string, fields?: Record<string, unknown>) => emit("error", event, fields),
};
