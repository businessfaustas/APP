import "server-only";

import { cached, TTL } from "@/lib/pipeline/cache";

import { fetchWithTimeout } from "./http";

/**
 * Dollars per one unit of a currency, for turning a price found in another country into the dollars the calculation uses.
 * Live rate from the European Central Bank's reference rates (Frankfurter, free and keyless), cached for 12 hours; if
 * that can't be reached, an approximate fixed rate, which the caller labels as approximate.
 */
export type FxCurrency = "USD" | "EUR" | "PLN";

/** Rough values for when the live rate is out of reach. Refresh these now and then; they only matter during an outage. */
export const FALLBACK_USD_PER: Record<FxCurrency, number> = { USD: 1, EUR: 1.1, PLN: 0.26 };

export interface FxRate {
  usdPerUnit: number;
  /** False when the fixed fallback was used. */
  live: boolean;
}

export function isFxCurrency(c: string): c is FxCurrency {
  return c === "USD" || c === "EUR" || c === "PLN";
}

/** Whole dollars for an amount in another currency. */
export function toUsd(amount: number, usdPerUnit: number): number {
  return Math.round(amount * usdPerUnit);
}

export async function usdPerUnit(currency: string): Promise<FxRate> {
  if (!isFxCurrency(currency)) return { usdPerUnit: 1, live: false };
  if (currency === "USD") return { usdPerUnit: 1, live: true };
  try {
    const rates = await cached<Record<string, number>>("fx:usd-base:v1", TTL.hours(12), async () => {
      const res = await fetchWithTimeout("https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR,PLN", { timeoutMs: 6000, cache: "no-store" });
      if (!res.ok) throw new Error(`FX answered HTTP ${res.status}`);
      const body = (await res.json()) as { rates?: Record<string, number> };
      if (!body.rates?.EUR || !body.rates?.PLN) throw new Error("FX answer had no rates");
      return body.rates;
    });
    const perUsd = rates[currency];
    if (perUsd && perUsd > 0.01 && perUsd < 100) return { usdPerUnit: 1 / perUsd, live: true };
  } catch (err) {
    console.error("Exchange rate lookup failed, using the fixed fallback", err);
  }
  return { usdPerUnit: FALLBACK_USD_PER[currency], live: false };
}
