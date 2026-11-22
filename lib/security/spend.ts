import "server-only";

import { env } from "@/lib/config/env";
import { sendAlert } from "@/lib/observability/alert";

import { rateLimit } from "./rateLimit";

export class ScrapeCapError extends Error {
  constructor() {
    super("The paid page reader has reached today's limit. Paste the listing text instead, or try again tomorrow.");
    this.name = "ScrapeCapError";
  }
}

/**
 * Daily cap on paid page-reader calls (ScrapingBee / Apify) across all users, so a bug, a loop
 * or an abusive account can't run up the bill. Warns at 80%; at the cap the app falls back to
 * "paste the listing text", which is free.
 */
export async function assertScrapeBudget(): Promise<void> {
  const cap = env().SCRAPE_DAILY_CAP;
  if (!cap) return; // 0 = no cap
  const r = await rateLimit("scrape-global", "all", cap, 86_400);
  if (!r.ok) {
    void sendAlert({
      key: "scrape-cap-hit",
      severity: "critical",
      title: "Paid page-reader daily cap reached",
      body: `${cap} calls today. Users are being asked to paste listing text. Raise SCRAPE_DAILY_CAP to allow more.`,
      throttleMinutes: 360,
    });
    throw new ScrapeCapError();
  }
  if (r.remaining <= cap * 0.2) {
    void sendAlert({
      key: "scrape-cap-80",
      severity: "warning",
      title: "Paid page-reader usage is at 80% of today's cap",
      body: `${cap - r.remaining} of ${cap} calls used.`,
      throttleMinutes: 360,
    });
  }
}
