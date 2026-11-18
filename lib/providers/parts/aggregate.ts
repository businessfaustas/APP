/**
 * Turns raw part listings (eBay Motors and the like) into the price ranges the estimator uses.
 * Pure: no I/O, so the matching rules can be unit tested without a network.
 *
 * What counts as evidence:
 *  - the listing's title has to name the same make and model, and any model years it mentions
 *    have to include the car's year;
 *  - "New" listings that say OEM / genuine / factory are the OEM price; other new listings are
 *    aftermarket; "Used" listings are the used price;
 *  - a range needs at least MIN_LISTINGS listings left after dropping prices far from the median.
 *    Fewer than that is no evidence, and the estimator falls back to its reference table.
 */
import type { PartSource, PriceEvidence } from "@/lib/domain/schemas";

export interface VehicleRef {
  year: number | null;
  make: string | null;
  model: string | null;
}

export interface PartListing {
  title: string;
  /** Whole dollars. */
  price: number;
  url: string;
  condition: "NEW" | "USED";
}

export interface MarketPartPrice {
  OEM_NEW: { low: number; mid: number; high: number } | null;
  AFTERMARKET: { low: number; mid: number; high: number } | null;
  USED: { low: number; mid: number; high: number } | null;
  evidence: PriceEvidence[];
}

export const MIN_LISTINGS = 3;
const SOURCES: PartSource[] = ["OEM_NEW", "AFTERMARKET", "USED"];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** The search text for a part on a car, e.g. "BMW M4 Front bumper cover". */
export function searchQuery(v: VehicleRef, partName: string): string {
  const part = partName
    .replace(/\b(lh|rh)\b/gi, (m) => (m.toLowerCase() === "lh" ? "left" : "right"))
    .replace(/\s+/g, " ")
    .trim();
  const words = [v.make, v.model, part].filter((x): x is string => Boolean(x && x.trim()));
  return words.join(" ").slice(0, 100);
}

const BAD_TITLE =
  /\b(toy|diecast|die[- ]?cast|scale model|1:\d{1,3}|sticker|decal|poster|keychain|brochure|manual|wanted|wtb|core charge|for parts|not working|cracked|broken|damaged)\b/i;
const OEM_CUE = /\b(oem|genuine|factory|original|dealer)\b/i;

/** True when the title is about this make and model, and about this model year. */
export function fitsVehicle(title: string, v: VehicleRef): boolean {
  if (BAD_TITLE.test(title)) return false;
  const t = norm(title);
  if (v.make) {
    const make = norm(v.make.split(/[\s-]+/)[0] ?? "");
    if (make && !t.includes(make)) return false;
  }
  if (v.model) {
    const full = norm(v.model);
    const first = norm(v.model.trim().split(/\s+/)[0] ?? "");
    const hit = (full && t.includes(full)) || (first.length >= 2 && t.includes(first));
    // a one-character model ("3") can't be matched safely; trust the make then
    if (!hit && (first.length >= 2 || full.length >= 2)) return false;
  }
  if (v.year) {
    const years = [...title.matchAll(/\b(19[89]\d|20[0-3]\d)\b/g)].map((m) => Number(m[1]));
    if (years.length > 0 && (v.year < Math.min(...years) || v.year > Math.max(...years))) return false;
  }
  return true;
}

function percentile(sorted: number[], p: number): number {
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  if (lo === hi) return sorted[lo]!;
  return Math.round(sorted[lo]! * (hi - i) + sorted[hi]! * (i - lo));
}

/** Interquartile range of the prices after dropping outliers; null without enough listings. */
export function robustRange(prices: number[]): { low: number; mid: number; high: number; kept: number[] } | null {
  if (prices.length < MIN_LISTINGS) return null;
  const sorted = [...prices].sort((a, b) => a - b);
  const median = percentile(sorted, 0.5);
  const kept = sorted.filter((p) => p >= median * 0.3 && p <= median * 3);
  if (kept.length < MIN_LISTINGS) return null;
  const mid = percentile(kept, 0.5);
  return { low: percentile(kept, 0.25), mid, high: percentile(kept, 0.75), kept };
}

export function summarizeListings(listings: PartListing[], v: VehicleRef, retrievedAt: string, provider = "eBay"): MarketPartPrice {
  const seen = new Set<string>();
  const buckets: Record<PartSource, PartListing[]> = { OEM_NEW: [], AFTERMARKET: [], USED: [] };
  for (const l of listings) {
    if (!Number.isFinite(l.price) || l.price <= 0 || seen.has(l.url) || !fitsVehicle(l.title, v)) continue;
    seen.add(l.url);
    const bucket: PartSource = l.condition === "USED" ? "USED" : OEM_CUE.test(l.title) ? "OEM_NEW" : "AFTERMARKET";
    buckets[bucket].push(l);
  }
  const out: MarketPartPrice = { OEM_NEW: null, AFTERMARKET: null, USED: null, evidence: [] };
  for (const source of SOURCES) {
    const range = robustRange(buckets[source].map((l) => l.price));
    if (!range) continue;
    out[source] = { low: range.low, mid: range.mid, high: range.high };
    const inRange = buckets[source].filter((l) => range.kept.includes(l.price));
    out.evidence.push({
      source,
      provider,
      count: inRange.length,
      sample: [...inRange]
        .sort((a, b) => Math.abs(a.price - range.mid) - Math.abs(b.price - range.mid))
        .slice(0, 3)
        .map((l) => ({ title: l.title.slice(0, 120), price: l.price, url: l.url })),
      retrievedAt,
    });
  }
  return out;
}
