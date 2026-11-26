import "server-only";

import { z } from "zod";

import type { Locale } from "@/lib/i18n/locales";

import { log } from "@/lib/observability/log";

import { generateStructured, generateWebResearch } from "../client";
import { webSearchProblem } from "../errors";
import { oneLine } from "../guard";
import { languageNote } from "../language";

const RangeSchema = z.object({ low: z.number().int().min(0), high: z.number().int().min(0) }).nullable();

const PartsPriceSchema = z.object({
  parts: z.array(
    z.object({
      index: z.number().int(),
      oem_new: RangeSchema,
      aftermarket: RangeSchema,
      used: RangeSchema,
    }),
  ),
});

export interface PartPriceEstimate {
  index: number;
  OEM_NEW: { low: number; high: number } | null;
  AFTERMARKET: { low: number; high: number } | null;
  USED: { low: number; high: number } | null;
}

/** One batched call pricing every part the reference table doesn't cover. */
export async function llmEstimatePartPrices(args: {
  vehicle: string;
  parts: { index: number; name: string; kind: "PART" | "SUBLET" }[];
  analysisId: string;
}): Promise<PartPriceEstimate[]> {
  if (args.parts.length === 0) return [];
  const r = await generateStructured({
    purpose: "PARTS_PRICE",
    kind: "text",
    schema: PartsPriceSchema,
    schemaName: "part_prices",
    instructions: `You are a collision parts buyer in the United States. Estimate current price RANGES in whole USD for each
part on the given vehicle, for three sources: OEM new (list price), aftermarket (certified/CAPA where common), and used
(recycled, good condition). Use null for a source that usually doesn't exist (e.g. aftermarket airbags). For sublet
services (alignment, A/C recharge, calibration…) give the typical shop price under "aftermarket" and null for the others.
Ranges should reflect normal market spread, not extremes.`,
    messages: [
      {
        role: "user",
        content: `Vehicle: ${oneLine(args.vehicle)}\nParts:\n${args.parts.map((p) => `${p.index}. ${oneLine(p.name, 80)}${p.kind === "SUBLET" ? " (service)" : ""}`).join("\n")}`,
      },
    ],
    analysisId: args.analysisId,
    maxOutputTokens: 3000,
  });
  return r.parts.map((p) => ({ index: p.index, OEM_NEW: p.oem_new, AFTERMARKET: p.aftermarket, USED: p.used }));
}

const ListingSchema = z.object({
  price: z.number().int().min(0),
  mileage: z.number().int().min(0).nullable(),
  trim: z.string().nullable(),
  /** "City, ST" when the listing shows it. */
  location: z.string().nullable(),
  url: z.string().nullable(),
});

const MarketEstimateSchema = z.object({
  p25: z.number().int().min(0),
  p50: z.number().int().min(0),
  p75: z.number().int().min(0),
  listings: z.array(ListingSchema).max(12),
  reasoning: z.string(),
});

export interface MarketEstimate {
  p25: number;
  p50: number;
  p75: number;
  /** Comparable listings the model read on the web (empty when it answered from knowledge). */
  listings: z.infer<typeof ListingSchema>[];
  reasoning: string;
  /** True when the numbers rest on listings found by searching the web just now. */
  grounded: boolean;
  searches: number;
}

const RESEARCH_INSTRUCTIONS = `You research used-car prices for a professional car flipper who must know what a vehicle is worth
CLEAN-TITLE and running before deciding how much to bid on a damaged one. Search the web for current US asking prices of this
exact vehicle: same year, make, model and trim, with mileage close to the given one (Cars.com, Autotrader, CarGurus, CarMax,
Edmunds, dealer sites). Prefer listings near the given location but accept national ones. For a very new or rare model, also
find the new-car price and how far used examples sit below it.
Report: up to 10 comparable listings, one per line, as "price | mileage | trim | city, ST | url"; then the typical asking range,
and anything you could not find. Report only what you actually read; never invent a listing or a url.`;

const ESTIMATE_INSTRUCTIONS = `Turn the research notes into a CLEAN-TITLE retail price distribution in whole USD for the vehicle
described, as dealers are asking today. Return the 25th, 50th and 75th percentile (p25 <= p50 <= p75) and the comparable
listings that appear in the notes (price, mileage, trim, location, url exactly as written there; null when absent; no listing
that is not in the notes). Adjust for the subject's mileage when the comparables differ a lot. Be conservative: this caps a bid.
In "reasoning", say in two sentences what the numbers rest on and how sure you are.`;

const KNOWLEDGE_INSTRUCTIONS = `Estimate the CLEAN-TITLE retail price distribution (asking prices at dealers) in USD for the
vehicle described, in the US today. Use every detail given (year, trim, engine, drive, mileage, region). Return the 25th, 50th
and 75th percentile. Leave "listings" empty: you have no listings to cite. Be conservative; this is used to cap a bid. In
"reasoning", say what you based it on and how sure you are (you may not know very recent models well).`;

function withLanguage(instructions: string, locale?: Locale): string {
  const note = languageNote(locale);
  return note ? `${instructions}\n\n${note}` : instructions;
}

function sane(e: { p25: number; p50: number; p75: number }): boolean {
  return e.p50 >= 500 && e.p25 <= e.p50 && e.p50 <= e.p75 && e.p75 <= e.p50 * 2.5 && e.p25 >= e.p50 * 0.4;
}

/**
 * The car's clean retail value. With an Anthropic key the model first searches the web for
 * comparable current listings, then the numbers are read off what it found; if that isn't
 * possible (no web search for the key, or another provider) it estimates from its own knowledge,
 * which the caller labels as a weaker estimate.
 */
export async function llmEstimateMarket(args: {
  /** One line, e.g. "2025 BMW M4 Competition". */
  vehicle: string;
  /** Everything else known about the car (engine, drive, odometer, location…), one per line. */
  details: string;
  mileage: number | null;
  zip: string | null;
  analysisId: string;
  /** Language of the "reasoning" text (default English). */
  locale?: Locale;
}): Promise<MarketEstimate> {
  const subject = `Vehicle: ${args.vehicle}\n${args.details}\nMileage: ${args.mileage ?? "unknown"}\nBuyer ZIP: ${args.zip ?? "unknown"}`;

  try {
    const research = await generateWebResearch({
      purpose: "MARKET_ESTIMATE",
      instructions: RESEARCH_INSTRUCTIONS,
      prompt: subject,
      analysisId: args.analysisId,
      maxSearches: 4,
    });
    if (research.text.trim()) {
      const out = await generateStructured({
        purpose: "MARKET_ESTIMATE",
        kind: "text",
        schema: MarketEstimateSchema,
        schemaName: "market_estimate",
        instructions: withLanguage(ESTIMATE_INSTRUCTIONS, args.locale),
        messages: [{ role: "user", content: `${subject}\n\nResearch notes:\n${research.text}` }],
        analysisId: args.analysisId,
        maxOutputTokens: 1800,
      });
      const listings = out.listings.filter((l) => l.price >= 500);
      if (sane(out) && listings.length >= 3) return { ...out, listings, grounded: true, searches: research.searches };
      // too thin to call it grounded: keep the numbers only if they are sane, as an estimate
      if (sane(out)) return { ...out, listings, grounded: false, searches: research.searches };
    }
  } catch (err) {
    // Customers just see the AI-estimate note; the reason goes to the logs and to the admin "Test" button on the AI row.
    log.warn("market.web_search_unavailable", { reason: webSearchProblem(err) });
  }

  const out = await generateStructured({
    purpose: "MARKET_ESTIMATE",
    kind: "text",
    schema: MarketEstimateSchema,
    schemaName: "market_estimate",
    instructions: withLanguage(KNOWLEDGE_INSTRUCTIONS, args.locale),
    messages: [{ role: "user", content: subject }],
    analysisId: args.analysisId,
    maxOutputTokens: 800,
  });
  if (!sane(out)) throw new Error("The market estimate was not plausible");
  return { ...out, listings: [], grounded: false, searches: 0 };
}
