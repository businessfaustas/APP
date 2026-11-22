import "server-only";

import { createHash } from "node:crypto";

import { env } from "@/lib/config/env";
import { prisma } from "@/lib/db/prisma";

import { sendAlert } from "./alert";
import { log } from "./log";
import { sendToSentry } from "./sentry";

export interface ErrorContext {
  source: "server" | "client" | "job" | "webhook";
  path?: string;
  method?: string;
  userId?: string;
  severity?: "error" | "fatal";
  extra?: Record<string, unknown>;
}

/** Numbers, ids and hashes are blanked so "Order 123 failed" and "Order 456 failed" are one problem. */
export function fingerprintOf(name: string, message: string, stack?: string): string {
  const norm = message
    .replace(/[0-9a-f]{8,}/gi, "#")
    .replace(/\d+/g, "#")
    .slice(0, 200);
  const frame =
    (stack ?? "")
      .split("\n")
      .find((l) => /^\s*at\s/.test(l) && !l.includes("node_modules"))
      ?.trim() ?? "";
  return createHash("sha1").update(`${name}|${norm}|${frame}`).digest("hex").slice(0, 16);
}

function asError(err: unknown): { name: string; message: string; stack?: string } {
  if (err instanceof Error) return { name: err.name, message: err.message, stack: err.stack };
  if (typeof err === "string") return { name: "Error", message: err };
  try {
    return { name: "Error", message: JSON.stringify(err).slice(0, 500) };
  } catch {
    return { name: "Error", message: String(err) };
  }
}

/**
 * Records an error everywhere it should go: the structured log, the error table (grouped, so a
 * loop is one row with a count), Sentry when SENTRY_DSN is set, and an alert for new problems
 * and anything fatal. Never throws.
 */
export async function captureError(err: unknown, ctx: ErrorContext): Promise<void> {
  try {
    const e = asError(err);
    const fingerprint = fingerprintOf(e.name, e.message, e.stack);
    log.error("error.captured", { fingerprint, source: ctx.source, path: ctx.path, method: ctx.method, userId: ctx.userId, err: e, ...ctx.extra });

    let isNew = false;
    try {
      const existing = await prisma.errorGroup.findUnique({ where: { fingerprint }, select: { lastSeen: true } });
      isNew = !existing;
      await prisma.errorGroup.upsert({
        where: { fingerprint },
        create: { fingerprint, source: ctx.source, message: e.message.slice(0, 500), stack: e.stack?.slice(0, 4_000), path: ctx.path?.slice(0, 300) },
        update: { count: { increment: 1 }, lastSeen: new Date(), resolved: false, path: ctx.path?.slice(0, 300) },
      });
    } catch {
      // the database may be the thing that is down
    }

    const dsn = env().SENTRY_DSN;
    if (dsn) {
      await sendToSentry(dsn, {
        message: e.message,
        name: e.name,
        stack: e.stack,
        level: ctx.severity === "fatal" ? "fatal" : "error",
        environment: process.env.VERCEL_ENV ?? env().NODE_ENV,
        release: process.env.VERCEL_GIT_COMMIT_SHA,
        tags: { source: ctx.source, fingerprint },
        extra: { userId: ctx.userId, ...ctx.extra },
        request: ctx.path ? { url: ctx.path, method: ctx.method } : undefined,
      });
    }

    if (isNew || ctx.severity === "fatal") {
      await sendAlert({
        key: `error:${fingerprint}`,
        severity: ctx.severity === "fatal" ? "critical" : "warning",
        title: `${ctx.severity === "fatal" ? "Fatal" : "New"} ${ctx.source} error: ${e.message.slice(0, 120)}`,
        body: [ctx.method && ctx.path ? `${ctx.method} ${ctx.path}` : ctx.path, e.stack?.split("\n").slice(0, 4).join("\n")].filter(Boolean).join("\n"),
        throttleMinutes: 60,
      });
    }
  } catch {
    // observability must never break the request it observes
  }
}
