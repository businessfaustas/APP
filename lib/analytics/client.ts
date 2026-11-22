"use client";

import { analyticsAllowed } from "@/lib/privacy/consent";
import type { AnalyticsEventName } from "@/lib/privacy/events";

/** True only after the visitor chose "Allow analytics" in the cookie banner. */
export function analyticsOn(): boolean {
  return typeof document !== "undefined" && analyticsAllowed(document.cookie);
}

function beacon(url: string, body: unknown): void {
  try {
    const data = JSON.stringify(body);
    if (navigator.sendBeacon?.(url, new Blob([data], { type: "application/json" }))) return;
    void fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: data, keepalive: true });
  } catch {
    // measuring must never break the page
  }
}

/** Records a product event. Does nothing without consent. No user id, IP or cookie is attached. */
export function track(name: AnalyticsEventName, props?: Record<string, string | number | boolean>): void {
  if (!analyticsOn()) return;
  beacon("/api/analytics", { name, path: window.location.pathname, props });
}

export function reportVital(metric: { name: string; value: number; rating?: string }): void {
  if (!analyticsOn()) return;
  if (!["LCP", "INP", "CLS", "FCP", "TTFB"].includes(metric.name)) return;
  beacon("/api/vitals", {
    name: metric.name,
    value: Math.round(metric.value * 1000) / 1000,
    rating: metric.rating ?? "good",
    path: window.location.pathname,
    device: window.matchMedia("(max-width: 767px)").matches ? "mobile" : "desktop",
  });
}

/** Sends a crash to /api/client-error (allowed without consent: it is a security and reliability signal, not tracking). */
export function reportClientError(error: unknown, extra: { digest?: string } = {}): void {
  try {
    const e = error instanceof Error ? error : new Error(String(error));
    const data = JSON.stringify({ message: e.message, name: e.name, stack: e.stack, path: window.location.pathname, digest: extra.digest });
    if (!navigator.sendBeacon?.("/api/client-error", new Blob([data], { type: "application/json" }))) {
      void fetch("/api/client-error", { method: "POST", headers: { "content-type": "application/json" }, body: data, keepalive: true });
    }
  } catch {
    // never throw from an error handler
  }
}
