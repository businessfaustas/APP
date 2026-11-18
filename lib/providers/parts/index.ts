import "server-only";

import { cached, TTL } from "@/lib/pipeline/cache";

import { summarizeListings, searchQuery, type MarketPartPrice, type PartListing, type VehicleRef } from "./aggregate";
import { searchEbayParts } from "./ebay";

export type { MarketPartPrice, VehicleRef } from "./aggregate";

export interface PartsMarketDeps {
  search: (query: string, condition: "NEW" | "USED") => Promise<PartListing[]>;
  /** Cache of raw listings (shared across users: it is public market data about a part). */
  cache: <T>(key: string, ttlMs: number, fn: () => Promise<T>) => Promise<T>;
  now: () => Date;
}

const DEFAULT_DEPS: PartsMarketDeps = { search: searchEbayParts, cache: cached, now: () => new Date() };

const slug = (s: string | null) => (s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
const POOL = 4;

/**
 * Reads live new and used listings for each part and summarizes them into price ranges.
 * A part whose lookup fails or finds too few listings is simply left out; the caller falls
 * back to its reference prices for that one.
 */
export async function marketPartPrices(
  args: { vehicle: VehicleRef; parts: { index: number; name: string }[] },
  deps: PartsMarketDeps = DEFAULT_DEPS,
): Promise<(MarketPartPrice & { index: number })[]> {
  const retrievedAt = deps.now().toISOString();
  const results: (MarketPartPrice & { index: number })[] = [];
  const queue = [...args.parts];

  async function one(part: { index: number; name: string }): Promise<void> {
    const query = searchQuery(args.vehicle, part.name);
    const key = `parts:ebay:v1:${slug(args.vehicle.make)}:${slug(args.vehicle.model)}:${args.vehicle.year ?? ""}:${slug(part.name)}`;
    try {
      const listings = await deps.cache(key, TTL.days(3), async () => {
        const [fresh, used] = await Promise.all([deps.search(query, "NEW"), deps.search(query, "USED")]);
        return [...fresh, ...used];
      });
      const summary = summarizeListings(listings, args.vehicle, retrievedAt);
      if (summary.evidence.length > 0) results.push({ index: part.index, ...summary });
    } catch (err) {
      console.error(`Market price lookup failed for "${part.name}"`, err);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(POOL, queue.length) }, async () => {
      for (let p = queue.shift(); p; p = queue.shift()) await one(p);
    }),
  );
  return results;
}
