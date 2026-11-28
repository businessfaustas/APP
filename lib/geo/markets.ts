/**
 * Where the AI looks for what an undamaged car sells for in each export destination (isomorphic, no I/O). The site names are
 * hints for the search, not a promise that every one is read. The currency is the one prices are advertised in.
 */
import { type ExportCountry } from "./countries";

export interface DestinationMarketMeta {
  /** English name, for the prompt. */
  country: string;
  currency: "EUR" | "PLN";
  sites: string[];
}

export const DESTINATION_MARKETS: Record<ExportCountry, DestinationMarketMeta> = {
  LT: { country: "Lithuania", currency: "EUR", sites: ["autoplius.lt", "autogidas.lt", "autoscout24.lt"] },
  LV: { country: "Latvia", currency: "EUR", sites: ["ss.lv", "auto24.lv", "autoscout24.com"] },
  EE: { country: "Estonia", currency: "EUR", sites: ["auto24.ee", "autoscout24.com"] },
  PL: { country: "Poland", currency: "PLN", sites: ["otomoto.pl", "olx.pl", "autoscout24.pl"] },
  DE: { country: "Germany", currency: "EUR", sites: ["mobile.de", "autoscout24.de"] },
};

export function destinationMeta(code: string): DestinationMarketMeta | null {
  return (DESTINATION_MARKETS as Record<string, DestinationMarketMeta | undefined>)[code] ?? null;
}

/** Odometer miles to whole kilometres, the unit European listings use. */
export function milesToKm(miles: number): number {
  return Math.round(miles * 1.609344);
}
