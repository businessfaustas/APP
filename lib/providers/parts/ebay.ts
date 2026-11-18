import "server-only";

import { env } from "@/lib/config/env";
import { fetchWithTimeout } from "@/lib/providers/http";

import type { PartListing } from "./aggregate";

/**
 * eBay Browse API: active fixed-price listings for a part. These are real asking prices from
 * real sellers (new aftermarket / OEM and used), which is the closest thing to a public parts
 * price feed. Needs a free eBay developer keyset (EBAY_CLIENT_ID / EBAY_CLIENT_SECRET).
 */
const API = "https://api.ebay.com";

let token: { value: string; expiresAt: number } | null = null;

export function ebayConfigured(): boolean {
  const e = env();
  return Boolean(e.EBAY_CLIENT_ID && e.EBAY_CLIENT_SECRET);
}

async function appToken(force = false): Promise<string> {
  if (!force && token && token.expiresAt > Date.now() + 60_000) return token.value;
  const e = env();
  const basic = Buffer.from(`${e.EBAY_CLIENT_ID}:${e.EBAY_CLIENT_SECRET}`).toString("base64");
  const res = await fetchWithTimeout(`${API}/identity/v1/oauth2/token`, {
    method: "POST",
    headers: { authorization: `Basic ${basic}`, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", scope: "https://api.ebay.com/oauth/api_scope" }),
    timeoutMs: 8000,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`eBay sign-in failed (HTTP ${res.status})`);
  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error("eBay sign-in returned no token");
  token = { value: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 7200) * 1000 };
  return token.value;
}

/** Makes one token request: proves the keyset works without searching anything. */
export async function checkEbay(): Promise<void> {
  await appToken(true);
}

interface ItemSummary {
  title?: string;
  itemWebUrl?: string;
  price?: { value?: string; currency?: string };
}

/** Condition ids: 1000 new, 1500 new other, 3000 used (7000 "for parts" is left out on purpose). */
const CONDITION = { NEW: "1000|1500", USED: "3000" } as const;

export async function searchEbayParts(query: string, condition: "NEW" | "USED"): Promise<PartListing[]> {
  const params = new URLSearchParams({
    q: query,
    filter: `conditionIds:{${CONDITION[condition]}},buyingOptions:{FIXED_PRICE},priceCurrency:USD`,
    limit: "50",
  });
  const call = async (force: boolean) =>
    fetchWithTimeout(`${API}/buy/browse/v1/item_summary/search?${params.toString()}`, {
      headers: {
        authorization: `Bearer ${await appToken(force)}`,
        "x-ebay-c-marketplace-id": env().EBAY_MARKETPLACE,
        accept: "application/json",
      },
      timeoutMs: 8000,
      cache: "no-store",
    });
  let res = await call(false);
  if (res.status === 401) res = await call(true); // the cached token expired early
  if (!res.ok) throw new Error(`eBay search failed (HTTP ${res.status})`);
  const data = (await res.json()) as { itemSummaries?: ItemSummary[] };
  const out: PartListing[] = [];
  for (const item of data.itemSummaries ?? []) {
    const price = Number(item.price?.value);
    if (!item.title || !item.itemWebUrl || !Number.isFinite(price) || item.price?.currency !== "USD") continue;
    out.push({ title: item.title, price: Math.round(price), url: item.itemWebUrl, condition });
  }
  return out;
}
