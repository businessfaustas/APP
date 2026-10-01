import "server-only";

import { z } from "zod";

import { generateStructured } from "../client";

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
        content: `Vehicle: ${args.vehicle}\nParts:\n${args.parts.map((p) => `${p.index}. ${p.name}${p.kind === "SUBLET" ? " (service)" : ""}`).join("\n")}`,
      },
    ],
    analysisId: args.analysisId,
    maxOutputTokens: 3000,
  });
  return r.parts.map((p) => ({ index: p.index, OEM_NEW: p.oem_new, AFTERMARKET: p.aftermarket, USED: p.used }));
}

const MarketEstimateSchema = z.object({
  p25: z.number().int().min(0),
  p50: z.number().int().min(0),
  p75: z.number().int().min(0),
  reasoning: z.string(),
});

/** Last-resort clean retail estimate when no comps provider is available. */
export async function llmEstimateMarket(args: {
  vehicle: string;
  mileage: number | null;
  zip: string | null;
  analysisId: string;
}): Promise<{ p25: number; p50: number; p75: number; reasoning: string }> {
  return generateStructured({
    purpose: "MARKET_ESTIMATE",
    kind: "text",
    schema: MarketEstimateSchema,
    schemaName: "market_estimate",
    instructions: `Estimate the CLEAN-TITLE retail price distribution (asking prices at dealers) in USD for the vehicle in the
given US area today. Return the 25th, 50th and 75th percentile. Be conservative; this is used to cap a bid.`,
    messages: [
      {
        role: "user",
        content: `Vehicle: ${args.vehicle}\nMileage: ${args.mileage ?? "unknown"}\nBuyer ZIP: ${args.zip ?? "unknown"}`,
      },
    ],
    analysisId: args.analysisId,
    maxOutputTokens: 600,
  });
}
