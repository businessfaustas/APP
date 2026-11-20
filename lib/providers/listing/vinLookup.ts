import "server-only";

import { z } from "zod";

import { generateStructured, generateWebResearch } from "@/lib/ai/client";
import { features } from "@/lib/config/env";
import type { InputPrefill } from "../types";
import { nhtsaDecode } from "../vin/nhtsa";
import type { RawListing } from "./normalize";

/**
 * What we can learn about a car from its VIN alone:
 *  1. who it is: the free NHTSA decode gives year, make, model, trim, engine, drive (always tried);
 *  2. which auction lot it is: with an AI key, the model searches the web for a listing of that
 *     exact VIN (Copart / IAAI lot pages and the sites that archive them) and reports damage,
 *     odometer, title, location and photo links it actually read.
 * Neither step throws: a failure just means less is known, and the user is asked for the rest.
 */
export interface VinLookup {
  /** Identity from the decode, for the form prefill and the listing. */
  identity: (InputPrefill & { engine: string | null; drive: string | null; fuel: string | null; transmission: string | null }) | null;
  /** A lot found for this VIN; null when none was found or AI is off. */
  found: { raw: RawListing; warnings: string[] } | null;
}

const FoundSchema = z.object({
  found: z.boolean(),
  /** True only if the notes name this exact VIN on the page the details come from. */
  vinOnPage: z.boolean(),
  source: z.enum(["COPART", "IAAI", "BIDCARS", "AUTOBIDMASTER", "OTHER"]),
  sourceUrl: z.string().nullable(),
  lotNumber: z.string().nullable(),
  status: z.enum(["UPCOMING", "SOLD", "UNKNOWN"]),
  saleDate: z.string().nullable(),
  odometer: z.number().int().min(0).nullable(),
  titleRaw: z.string().nullable(),
  primaryDamage: z.string().nullable(),
  secondaryDamage: z.string().nullable(),
  runCondition: z.string().nullable(),
  hasKeys: z.boolean().nullable(),
  currentBid: z.number().int().min(0).nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  color: z.string().nullable(),
  photoUrls: z.array(z.string()).max(30),
});

const RESEARCH = `You help a car buyer find the auction listing for a specific vehicle by its VIN. Search the web for the exact
VIN (in quotes): Copart and IAAI lot pages, Bid.cars, and the sites that archive auction listings and sale history. Report, in
plain lines, for the most recent listing that shows this exact VIN: the site and page url, lot number, whether the sale is
upcoming or already sold and its date, odometer, title type, primary and secondary damage, run condition, keys, current or
final bid, the yard's city and state, colour, and any direct full-size image urls you saw. If no page shows this exact VIN,
say "not found". Report only what you actually read; never guess a value or invent a url.`;

const EXTRACT = `Turn the research notes into the listing fields. Set found=false if the notes say not found or name no listing.
vinOnPage is true only if the notes say the page shows this exact VIN. Use null for anything the notes don't state. Odometer in
miles unless the notes say kilometres (then convert to miles). Damage in the auction's words (e.g. "FRONT END"). Include only
image urls that appear in the notes, as written.`;

const clip = (s: string | null | undefined, n: number) => (s ? s.trim().slice(0, n) : null);

export async function lookupByVin(vin: string, analysisId: string): Promise<VinLookup> {
  let identity: VinLookup["identity"] = null;
  try {
    const d = await nhtsaDecode(vin);
    if (d.make && d.model) {
      identity = {
        vin,
        year: d.year,
        make: clip(d.make, 40),
        model: clip(d.model, 60),
        trim: clip(d.trim, 80),
        titleRaw: null,
        state: null,
        city: null,
        engine: d.engine,
        drive: d.driveType,
        fuel: d.fuelType,
        transmission: d.transmission,
      };
    }
  } catch (err) {
    console.warn("VIN decode failed:", err instanceof Error ? err.message : err);
  }

  if (!features.ai()) return { identity, found: null };
  try {
    const car = identity ? [identity.year, identity.make, identity.model].filter(Boolean).join(" ") : "unknown vehicle";
    const research = await generateWebResearch({
      purpose: "EXTRACT",
      instructions: RESEARCH,
      prompt: `VIN: ${vin}\nThe VIN decodes to: ${car}`,
      analysisId,
      maxSearches: 3,
    });
    if (!research.text.trim()) return { identity, found: null };
    const out = await generateStructured({
      purpose: "EXTRACT",
      kind: "text",
      schema: FoundSchema,
      schemaName: "vin_listing",
      instructions: EXTRACT,
      messages: [{ role: "user", content: `VIN: ${vin}\n\nResearch notes:\n${research.text}` }],
      analysisId,
      maxOutputTokens: 1500,
    });
    // a lot that doesn't show this VIN, or says nothing about the damage or photos, is not usable
    if (!out.found || !out.vinOnPage || !(out.primaryDamage || out.photoUrls.length > 0)) return { identity, found: null };
    const warnings = [
      out.status === "SOLD"
        ? "Found by searching the web for this VIN. The sale looks finished, so this may be an earlier sale: check the damage, odometer and bid on the lot page."
        : "Found by searching the web for this VIN. Check the details against the lot page before bidding.",
    ];
    const raw: RawListing = {
      source: out.source,
      sourceUrl: out.sourceUrl && /^https:\/\//i.test(out.sourceUrl) ? out.sourceUrl : null,
      lotNumber: clip(out.lotNumber, 30),
      vin,
      odometer: out.odometer,
      titleRaw: clip(out.titleRaw, 80),
      primaryDamage: clip(out.primaryDamage, 60),
      secondaryDamage: clip(out.secondaryDamage, 60),
      runConditionRaw: clip(out.runCondition, 40),
      hasKeys: out.hasKeys,
      currentBid: out.currentBid,
      saleDate: out.status === "UPCOMING" ? out.saleDate : null,
      color: clip(out.color, 30),
      location: { yardName: null, city: clip(out.city, 60), state: clip(out.state, 2)?.toUpperCase() ?? null, zip: null },
      photoUrls: out.photoUrls.filter((u) => /^https:\/\//i.test(u)),
    };
    return { identity, found: { raw, warnings } };
  } catch (err) {
    console.error("Looking the VIN up on the web failed", err instanceof Error ? err.message : err);
    return { identity, found: null };
  }
}
