import { z } from "zod";

import { AuctionSourceSchema } from "@/lib/domain/schemas";

export const ManualListingSchema = z.object({
  vin: z.string().max(20).nullish(),
  year: z.number().int().min(1950).max(2100).nullish(),
  make: z.string().max(40).nullish(),
  model: z.string().max(60).nullish(),
  trim: z.string().max(80).nullish(),
  odometer: z.number().int().min(0).max(2_000_000).nullish(),
  titleRaw: z.string().max(80).nullish(),
  primaryDamage: z.string().max(60).nullish(),
  secondaryDamage: z.string().max(60).nullish(),
  runCondition: z.string().max(40).nullish(),
  hasKeys: z.boolean().nullish(),
  currentBid: z.number().int().min(0).max(5_000_000).nullish(),
  zip: z.string().max(10).nullish(),
  state: z.string().max(2).nullish(),
  city: z.string().max(60).nullish(),
  saleDate: z.string().max(40).nullish(),
});
export type ManualListing = z.infer<typeof ManualListingSchema>;

export const ExtensionCaptureSchema = z.object({
  url: z.string().url().max(2000),
  pageText: z.string().max(200_000),
  html: z.string().max(2_000_000).nullish(),
  jsonLd: z.array(z.string().max(100_000)).max(20).optional(),
  imageUrls: z.array(z.string().url().max(2000)).max(80),
});

export const InputPayloadSchema = z.object({
  parsed: z.object({
    type: z.enum(["URL", "VIN", "TEXT", "MANUAL", "EXTENSION"]),
    source: AuctionSourceSchema.nullable(),
    lotNumber: z.string().nullable(),
    url: z.string().nullable(),
    vin: z.string().nullable(),
  }),
  text: z.string().max(60_000).nullable(),
  manual: ManualListingSchema.nullable(),
  photos: z.array(z.string()).max(40),
  extension: ExtensionCaptureSchema.nullable(),
});
export type InputPayload = z.infer<typeof InputPayloadSchema>;

export const STEP_LABELS: Record<string, string> = {
  QUEUED: "Queued",
  "parse-input": "Reading your input",
  "fetch-listing": "Fetching the listing",
  NEEDS_INPUT: "Waiting for listing details",
  "store-photos": "Saving photos",
  "decode-and-check": "Decoding VIN & checking history",
  "vision-audit": "Analyzing photos",
  "market-valuation": "Pulling market comps",
  "repair-estimate": "Estimating repairs",
  calculate: "Calculating your max bid",
  narrate: "Writing the summary",
  finalize: "Finishing up",
  done: "Done",
};

export const PROGRESS_STEPS = [
  { key: "fetch-listing", label: "Fetching listing", at: 15 },
  { key: "decode-and-check", label: "Decoding VIN & history", at: 30 },
  { key: "vision-audit", label: "Analyzing photos", at: 55 },
  { key: "market-valuation", label: "Pulling market comps", at: 55 },
  { key: "repair-estimate", label: "Estimating repairs", at: 70 },
  { key: "calculate", label: "Calculating max bid", at: 90 },
  { key: "narrate", label: "Writing summary", at: 97 },
] as const;
