import "server-only";

import { env, features } from "@/lib/config/env";
import { prisma } from "@/lib/db/prisma";

import { log } from "./log";

export type AlertSeverity = "info" | "warning" | "critical";

export interface Alert {
  /** Same key = same incident: it is sent at most once per `throttleMinutes`. */
  key: string;
  title: string;
  body?: string;
  severity?: AlertSeverity;
  throttleMinutes?: number;
}

const ICON: Record<AlertSeverity, string> = { info: "ℹ️", warning: "⚠️", critical: "🚨" };

/** True when this key was not alerted recently (and marks it as alerted). */
async function claim(key: string, minutes: number): Promise<boolean> {
  const cacheKey = `alert:${key}`;
  try {
    const now = new Date();
    const existing = await prisma.apiCache.findUnique({ where: { key: cacheKey } });
    if (existing && existing.expiresAt > now) return false;
    const expiresAt = new Date(now.getTime() + minutes * 60_000);
    await prisma.apiCache.upsert({
      where: { key: cacheKey },
      create: { key: cacheKey, value: { at: now.toISOString() }, expiresAt },
      update: { value: { at: now.toISOString() }, expiresAt },
    });
    return true;
  } catch {
    return true; // if the database is the problem, still try to tell someone
  }
}

/**
 * Tells a human. Webhook (Slack, Discord, or anything that accepts JSON) and/or email, both
 * optional. Never throws: alerting must not take a request down with it.
 */
export async function sendAlert(alert: Alert): Promise<boolean> {
  const severity = alert.severity ?? "warning";
  log[severity === "critical" ? "error" : "warn"]("alert", { key: alert.key, title: alert.title, severity });
  const { ALERT_WEBHOOK_URL, ALERT_EMAIL, EMAIL_FROM, RESEND_API_KEY } = env();
  if (!ALERT_WEBHOOK_URL && !(ALERT_EMAIL && RESEND_API_KEY)) return false;
  if (!(await claim(alert.key, alert.throttleMinutes ?? 30))) return false;

  const text = `${ICON[severity]} [${process.env.VERCEL_ENV ?? env().NODE_ENV}] ${alert.title}${alert.body ? `\n${alert.body}` : ""}`.slice(0, 1_800);
  let delivered = false;
  if (ALERT_WEBHOOK_URL) {
    try {
      // `text` is Slack's field, `content` is Discord's; other receivers can read either.
      const res = await fetch(ALERT_WEBHOOK_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, content: text, severity, title: alert.title }),
        signal: AbortSignal.timeout(5_000),
      });
      delivered = res.ok || delivered;
    } catch (err) {
      log.warn("alert.webhook_failed", { err });
    }
  }
  if (ALERT_EMAIL && features.email()) {
    try {
      const { Resend } = await import("resend");
      await new Resend(RESEND_API_KEY).emails.send({ from: EMAIL_FROM, to: ALERT_EMAIL, subject: `${ICON[severity]} ${alert.title}`.slice(0, 120), text });
      delivered = true;
    } catch (err) {
      log.warn("alert.email_failed", { err });
    }
  }
  return delivered;
}
