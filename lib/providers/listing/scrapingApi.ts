import "server-only";

import { env } from "@/lib/config/env";
import { detectAuctionUrl } from "@/lib/input/urls";

import { assertPublicUrl, fetchWithTimeout } from "../http";

const lastFetchByHost = new Map<string, number>();
const MIN_INTERVAL_MS = 2000;

async function politeDelay(host: string): Promise<void> {
  const last = lastFetchByHost.get(host) ?? 0;
  const wait = last + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastFetchByHost.set(host, Date.now());
}

/**
 * Fetches a rendered listing page via ScrapingBee (or an Apify actor). Server fetches of
 * auction sites only ever go through these providers, with per-host rate limiting.
 */
export async function fetchListingPage(url: string): Promise<{ html: string; provider: string }> {
  const target = await assertPublicUrl(url);
  const detected = detectAuctionUrl(url);
  await politeDelay(target.hostname);
  const e = env();

  if (e.SCRAPINGBEE_API_KEY) {
    const api = new URL("https://app.scrapingbee.com/api/v1/");
    api.searchParams.set("api_key", e.SCRAPINGBEE_API_KEY);
    api.searchParams.set("url", target.toString());
    api.searchParams.set("render_js", "true");
    api.searchParams.set("premium_proxy", "true");
    api.searchParams.set("country_code", "us");
    api.searchParams.set("wait", "2500");
    const res = await fetchWithTimeout(api.toString(), { timeoutMs: 60000 });
    if (!res.ok) throw new Error(`ScrapingBee returned HTTP ${res.status}`);
    const html = await res.text();
    if (html.length < 500) throw new Error("ScrapingBee returned an empty page");
    return { html, provider: `ScrapingBee (${detected?.source ?? "page"})` };
  }

  if (e.APIFY_TOKEN && e.APIFY_ACTOR_ID) {
    const api = `https://api.apify.com/v2/acts/${encodeURIComponent(e.APIFY_ACTOR_ID)}/run-sync-get-dataset-items?token=${encodeURIComponent(e.APIFY_TOKEN)}`;
    const res = await fetchWithTimeout(api, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ startUrls: [{ url: target.toString() }] }),
      timeoutMs: 120000,
    });
    if (!res.ok) throw new Error(`Apify returned HTTP ${res.status}`);
    const items = (await res.json()) as unknown[];
    // Actors return structured items; serialize them so the text extractors / LLM can read them.
    const text = JSON.stringify(items, null, 1).slice(0, 60000);
    return { html: `<html><body><pre>${text.replace(/</g, "&lt;")}</pre></body></html>`, provider: "Apify" };
  }

  throw new Error("No scraping provider configured");
}
