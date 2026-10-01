import "server-only";

import { llmEstimateMarket } from "@/lib/ai/prompts/estimates";
import { applyBps } from "@/lib/calc/money";
import { env, features } from "@/lib/config/env";
import type { Comp, MarketValuation } from "@/lib/domain/schemas";

import { fetchJson } from "../http";
import { adjustComps, compsConfidence, median, mileageSlope, scenarioValues } from "./stats";

export interface MarketRequest {
  vin: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  mileage: number | null;
  zip: string | null;
  listToSaleBps: number;
  listedRetailValue: number | null;
  analysisId: string;
}

type Json = Record<string, unknown>;

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() && !Number.isNaN(Number(v)) ? Number(v) : null;
}

/** Marketcheck active listings → comps. Widens the search when fewer than 5 comps. */
async function marketcheckComps(req: MarketRequest): Promise<{ comps: Comp[]; widened: boolean }> {
  const key = env().MARKETCHECK_API_KEY!;
  const search = async (yearSpan: number, radius: number) => {
    const url = new URL("https://mc-api.marketcheck.com/v2/search/car/active");
    url.searchParams.set("api_key", key);
    url.searchParams.set("car_type", "used");
    url.searchParams.set("rows", "50");
    url.searchParams.set("make", req.make ?? "");
    url.searchParams.set("model", req.model ?? "");
    if (req.year) {
      const years = Array.from({ length: yearSpan * 2 + 1 }, (_, i) => req.year! - yearSpan + i);
      url.searchParams.set("year", years.join(","));
    }
    if (req.zip) {
      url.searchParams.set("zip", req.zip);
      url.searchParams.set("radius", String(radius));
    }
    if (req.mileage !== null) url.searchParams.set("miles_range", `${Math.max(0, req.mileage - 25000)}-${req.mileage + 25000}`);
    const json = await fetchJson<Json>(url.toString(), { timeoutMs: 20000 });
    const listings = Array.isArray(json.listings) ? (json.listings as Json[]) : [];
    return listings
      .map((l): Comp | null => {
        const price = num(l.price);
        if (!price || price < 1000) return null;
        const build = (l.build ?? {}) as Json;
        const dealer = (l.dealer ?? {}) as Json;
        return {
          price: Math.round(price),
          adjustedPrice: Math.round(price),
          mileage: num(l.miles) !== null ? Math.round(num(l.miles)!) : null,
          year: num(build.year),
          trim: typeof build.trim === "string" ? build.trim : null,
          distanceMiles: num(l.dist) !== null ? Math.round(num(l.dist)!) : null,
          sellerType: l.seller_type === "private" ? "private" : "dealer",
          daysOnMarket: num(l.dom) !== null ? Math.round(num(l.dom)!) : null,
          url: typeof l.vdp_url === "string" ? l.vdp_url : null,
          city: typeof dealer.city === "string" ? dealer.city : null,
          state: typeof dealer.state === "string" ? dealer.state : null,
        };
      })
      .filter((c): c is Comp => c !== null);
  };
  let comps = await search(1, 200);
  let widened = false;
  if (comps.length < 5) {
    comps = await search(2, 500);
    widened = true;
  }
  return { comps, widened };
}

async function vinAuditMarket(req: MarketRequest): Promise<{ p25: number; p50: number; p75: number; count: number } | null> {
  const e = env();
  if (!req.vin) return null;
  const url = new URL(e.VINAUDIT_MARKET_URL);
  url.searchParams.set("key", e.VINAUDIT_API_KEY!);
  url.searchParams.set("vin", req.vin);
  url.searchParams.set("format", "json");
  url.searchParams.set("period", "90");
  if (req.mileage !== null) url.searchParams.set("mileage", String(req.mileage));
  const json = await fetchJson<Json>(url.toString(), { timeoutMs: 20000 });
  const prices = (json.prices ?? {}) as Json;
  const mean = num(prices.average) ?? num(json.mean);
  if (!mean) return null;
  const stdev = num(json.stdev) ?? mean * 0.08;
  return {
    p50: Math.round(mean),
    p25: Math.round(num(prices.below) ?? mean - 0.674 * stdev),
    p75: Math.round(num(prices.above) ?? mean + 0.674 * stdev),
    count: Math.round(num(json.count) ?? 0),
  };
}

function vehicleLabel(r: MarketRequest): string {
  return [r.year, r.make, r.model, r.trim].filter(Boolean).join(" ");
}

/**
 * Market valuation chain: Marketcheck comps → VinAudit market value → listing ACV × 0.85 →
 * AI estimate. Returns provider "NONE" (mvClean zeros) when nothing is available, so the UI
 * can ask the user to enter a value.
 */
export async function valueMarket(req: MarketRequest): Promise<MarketValuation> {
  const notes: string[] = [];

  if (features.marketcheck() && req.make && req.model) {
    try {
      const { comps, widened } = await marketcheckComps(req);
      if (comps.length >= 3) {
        const slope = mileageSlope(comps);
        const adjusted = adjustComps(comps, req.mileage, slope);
        const dom = adjusted.map((c) => c.daysOnMarket).filter((d): d is number => d !== null);
        if (widened) notes.push("Few local comps — the search was widened to ±2 years and 500 miles.");
        notes.push(
          `${comps.length} comps adjusted to ${req.mileage ?? "—"} mi at ${slope.toFixed(3)} $/mi and a ${(req.listToSaleBps / 100).toFixed(0)}% list-to-sale ratio.`,
        );
        return {
          provider: "Marketcheck",
          isDemo: false,
          confidence: Math.max(0.2, compsConfidence(adjusted) - (widened ? 0.15 : 0)),
          compsCount: adjusted.length,
          comps: adjusted.slice(0, 40),
          mvClean: scenarioValues(adjusted, req.listToSaleBps),
          medianDaysOnMarket: dom.length ? Math.round(median(dom)) : null,
          mileageSlopePerMile: slope,
          notes,
        };
      }
      notes.push("Marketcheck returned too few comps.");
    } catch (err) {
      console.error("Marketcheck failed", err);
      notes.push("Marketcheck was unavailable.");
    }
  }

  if (features.vinauditMarket() && req.vin) {
    try {
      const v = await vinAuditMarket(req);
      if (v) {
        return {
          provider: "VinAudit market value",
          isDemo: false,
          confidence: v.count >= 20 ? 0.65 : 0.5,
          compsCount: v.count,
          comps: [],
          mvClean: {
            worst: applyBps(v.p25, req.listToSaleBps),
            expected: applyBps(v.p50, req.listToSaleBps),
            best: applyBps(v.p75, req.listToSaleBps),
          },
          medianDaysOnMarket: null,
          mileageSlopePerMile: null,
          notes: [...notes, `Based on ${v.count} recent listings nationwide.`],
        };
      }
    } catch (err) {
      console.error("VinAudit market value failed", err);
      notes.push("VinAudit market value was unavailable.");
    }
  }

  if (features.ai() && req.make && req.model) {
    try {
      const est = await llmEstimateMarket({ vehicle: vehicleLabel(req), mileage: req.mileage, zip: req.zip, analysisId: req.analysisId });
      return {
        provider: "AI estimate — verify",
        isDemo: false,
        confidence: 0.25,
        compsCount: 0,
        comps: [],
        mvClean: {
          worst: applyBps(est.p25, req.listToSaleBps),
          expected: applyBps(est.p50, req.listToSaleBps),
          best: applyBps(est.p75, req.listToSaleBps),
        },
        medianDaysOnMarket: null,
        mileageSlopePerMile: null,
        notes: [...notes, "No comps provider configured — this is an AI estimate. Check real listings before bidding.", est.reasoning],
      };
    } catch (err) {
      console.error("AI market estimate failed", err);
    }
  }

  if (req.listedRetailValue && req.listedRetailValue > 1000) {
    const base = applyBps(req.listedRetailValue, 8500);
    return {
      provider: "Auction ACV × 0.85",
      isDemo: false,
      confidence: 0.3,
      compsCount: 0,
      comps: [],
      mvClean: { worst: applyBps(base, 9200), expected: base, best: applyBps(base, 10800) },
      medianDaysOnMarket: null,
      mileageSlopePerMile: null,
      notes: [...notes, "Based on the auction's own retail value estimate (often inflated) × 0.85. Enter a real market value for accuracy."],
    };
  }

  return {
    provider: "NONE",
    isDemo: false,
    confidence: 0,
    compsCount: 0,
    comps: [],
    mvClean: { best: 0, expected: 0, worst: 0 },
    medianDaysOnMarket: null,
    mileageSlopePerMile: null,
    notes: [...notes, "No market data source is available. Enter the clean retail value to get a max bid."],
  };
}
