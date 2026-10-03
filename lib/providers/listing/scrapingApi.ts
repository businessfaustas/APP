import "server-only";

import { env } from "@/lib/config/env";
import { detectAuctionUrl, KNOWN_AUCTION_HOSTS } from "@/lib/input/urls";

import { assertPublicUrl, fetchWithTimeout } from "../http";

const lastFetchByHost = new Map<string, number>();
const MIN_INTERVAL_MS = 2000;

async function politeDelay(host: string): Promise<void> {
  const last = lastFetchByHost.get(host) ?? 0;
  const wait = last + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastFetchByHost.set(host, Date.now());
}

// Bot-protection pages (Imperva/Incapsula, Cloudflare, Akamai, PerimeterX) instead of the listing.
const BOT_WALL =
  /(_Incapsula_Resource|Incapsula incident|cf-chl-|challenge-platform|<title>\s*Just a moment|Attention Required! \| Cloudflare|Access Denied|Pardon Our Interruption|px-captcha|captcha-delivery|Request unsuccessful)/i;

const BROWSER_HEADERS = {
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "accept-language": "en-US,en;q=0.9",
};

/**
 * Free first attempt: reads the lot page the way a browser would. Many auction sites block
 * cloud servers, so callers must expect this to fail and fall back to asking the user.
 * Only known auction hosts, at most 3 same-site redirects, short timeout.
 */
export async function fetchListingPageDirect(url: string): Promise<{ html: string; provider: string }> {
  if (env().LISTING_DIRECT_FETCH === "false") throw new Error("Direct page reads are turned off");
  let target = await assertPublicUrl(url);
  const isAuctionHost = (host: string) => KNOWN_AUCTION_HOSTS.some((re) => re.test(host));
  if (!isAuctionHost(target.hostname)) throw new Error("Not an auction site");
  await politeDelay(target.hostname);
  for (let hop = 0; hop < 4; hop++) {
    const res = await fetchWithTimeout(target.toString(), { headers: BROWSER_HEADERS, redirect: "manual", timeoutMs: 8000 });
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      const next = await assertPublicUrl(new URL(location, target).toString());
      if (!isAuctionHost(next.hostname)) throw new Error("Redirected off the auction site");
      target = next;
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    if (html.length < 2000 || BOT_WALL.test(html.slice(0, 30000))) throw new Error("Blocked by the site's bot protection");
    const detected = detectAuctionUrl(target.toString());
    return { html, provider: `Direct read (${detected?.source ?? "page"})` };
  }
  throw new Error("Too many redirects");
}

/**
 * Fetches a rendered listing page via ScrapingBee (or an Apify actor). Server fetches of
 * auction sites go through these providers or the direct read above, with per-host rate limiting.
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
