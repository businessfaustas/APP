import "server-only";

import { z } from "zod";

import { TITLE_CATEGORIES, type TitleCategory } from "@/lib/domain/schemas";
import type { RawListing } from "@/lib/providers/listing/normalize";

import { generateStructured } from "../client";

const ExtractedListingSchema = z.object({
  vin: z.string().nullable(),
  lotNumber: z.string().nullable(),
  year: z.number().int().nullable(),
  make: z.string().nullable(),
  model: z.string().nullable(),
  trim: z.string().nullable(),
  odometer: z.number().int().nullable(),
  odometerUnit: z.enum(["mi", "km"]).nullable(),
  odometerBrand: z.string().nullable().describe("e.g. ACTUAL, NOT ACTUAL, EXEMPT, EXCEEDS MECHANICAL LIMITS"),
  title: z.string().nullable().describe("Title / sale document exactly as written, e.g. 'SALVAGE CERTIFICATE (TX)'"),
  titleState: z.string().nullable(),
  primaryDamage: z.string().nullable(),
  secondaryDamage: z.string().nullable(),
  runCondition: z.string().nullable().describe("e.g. 'Run and Drive', 'Engine Starts', 'Stationary'"),
  hasKeys: z.boolean().nullable(),
  engine: z.string().nullable(),
  transmission: z.string().nullable(),
  drive: z.string().nullable(),
  fuel: z.string().nullable(),
  color: z.string().nullable(),
  saleDateIso: z.string().nullable().describe("Auction date/time in ISO 8601 with timezone offset if known"),
  saleStatus: z.string().nullable().describe("e.g. 'Pure Sale', 'On Approval', 'Minimum Bid'"),
  currentBid: z.number().int().nullable(),
  buyNowPrice: z.number().int().nullable(),
  estimatedRetailValue: z.number().int().nullable().describe("Est. Retail Value / ACV shown by the auction"),
  yardName: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable().describe("2-letter US state"),
  zip: z.string().nullable(),
  sellerType: z.string().nullable(),
  photoUrls: z.array(z.string()).describe("Full-size photo URLs of this vehicle, if present in the text"),
});

const EXTRACT_INSTRUCTIONS = `You extract structured data from salvage-auction listings (Copart, IAAI, Bid.cars and similar).
Use only information present in the text. Use null when a field is missing — never guess.
Money values are whole US dollars. Odometer is a whole number.`;

export async function llmExtractListing(text: string, analysisId: string | null): Promise<RawListing> {
  const r = await generateStructured({
    purpose: "EXTRACT",
    kind: "text",
    schema: ExtractedListingSchema,
    schemaName: "auction_listing",
    instructions: EXTRACT_INSTRUCTIONS,
    messages: [{ role: "user", content: `Listing text:\n"""\n${text.slice(0, 30000)}\n"""` }],
    analysisId,
    maxOutputTokens: 2000,
  });
  return {
    vin: r.vin,
    lotNumber: r.lotNumber,
    year: r.year,
    make: r.make,
    model: r.model,
    trim: r.trim,
    odometer: r.odometer,
    odometerUnit: r.odometerUnit ?? "mi",
    odometerBrandRaw: r.odometerBrand,
    titleRaw: r.title,
    titleState: r.titleState,
    primaryDamage: r.primaryDamage,
    secondaryDamage: r.secondaryDamage,
    runConditionRaw: r.runCondition,
    hasKeys: r.hasKeys,
    engine: r.engine,
    transmission: r.transmission,
    drive: r.drive,
    fuel: r.fuel,
    color: r.color,
    saleDate: r.saleDateIso,
    saleStatusRaw: r.saleStatus,
    currentBid: r.currentBid,
    buyNowPrice: r.buyNowPrice,
    listedRetailValue: r.estimatedRetailValue,
    location: { yardName: r.yardName, city: r.city, state: r.state, zip: r.zip },
    sellerType: r.sellerType,
    photoUrls: r.photoUrls.filter((u) => /^https?:\/\//.test(u)),
  };
}

export async function llmClassifyTitle(raw: string, analysisId: string | null): Promise<TitleCategory> {
  const r = await generateStructured({
    purpose: "TITLE",
    kind: "text",
    schema: z.object({ category: z.enum(TITLE_CATEGORIES) }),
    schemaName: "title_category",
    instructions:
      "Classify a US vehicle title / sale document string. NON_REPAIRABLE = certificate of destruction, junk, non-repairable, dismantle only. PARTS_ONLY = parts-only bill of sale. Use UNKNOWN if unsure.",
    messages: [{ role: "user", content: raw }],
    analysisId,
    maxOutputTokens: 100,
  });
  return r.category;
}
