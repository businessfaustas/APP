import "server-only";

import { fetchJson } from "../http";

const cache = new Map<string, { rate: number; at: number }>();
const TTL = 12 * 60 * 60 * 1000;
const FALLBACK: Record<string, number> = { EUR: 0.92, GBP: 0.79, PLN: 3.95, CAD: 1.37 };

/** USD → currency rate from ECB reference rates (Frankfurter), cached 12 h. */
export async function usdRate(currency: string): Promise<{ rate: number; source: "ECB" | "fallback" }> {
  if (currency === "USD") return { rate: 1, source: "ECB" };
  const hit = cache.get(currency);
  if (hit && Date.now() - hit.at < TTL) return { rate: hit.rate, source: "ECB" };
  try {
    const json = await fetchJson<{ rates?: Record<string, number> }>(`https://api.frankfurter.app/latest?from=USD&to=${encodeURIComponent(currency)}`, {
      timeoutMs: 8000,
    });
    const rate = json.rates?.[currency];
    if (rate && rate > 0) {
      cache.set(currency, { rate, at: Date.now() });
      return { rate, source: "ECB" };
    }
  } catch (err) {
    console.error("FX lookup failed", err);
  }
  return { rate: FALLBACK[currency] ?? 1, source: "fallback" };
}
