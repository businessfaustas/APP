import "server-only";

import { llmExtractListing } from "@/lib/ai/prompts/extractListing";
import { features } from "@/lib/config/env";
import { findDemoFixture } from "@/lib/demo/fixtures";
import type { AuctionSource, NormalizedListing } from "@/lib/domain/schemas";
import { describeHints, hintsFromAuctionUrl, hintsIdentifyVehicle, type UrlHints } from "@/lib/input/urlHints";
import { sourceLabel } from "@/lib/input/urls";

import { NeedsInputError, type ProviderResult } from "../types";
import { extractionScore, heuristicExtract } from "./heuristicExtract";
import { extractFromHtml } from "./htmlExtract";
import { finalizeListing, hasVehicleIdentity, mergeRaw, type RawListing } from "./normalize";
import { fetchListingPage, fetchListingPageDirect } from "./scrapingApi";

export interface ManualListingInput {
  vin?: string | null;
  year?: number | null;
  make?: string | null;
  model?: string | null;
  trim?: string | null;
  odometer?: number | null;
  titleRaw?: string | null;
  primaryDamage?: string | null;
  secondaryDamage?: string | null;
  runCondition?: string | null;
  hasKeys?: boolean | null;
  currentBid?: number | null;
  listedRetailValue?: number | null;
  zip?: string | null;
  state?: string | null;
  city?: string | null;
  saleDate?: string | null;
}

export interface ExtensionCapture {
  url: string;
  pageText: string;
  html?: string | null;
  jsonLd?: string[];
  imageUrls: string[];
}

export interface ListingRequest {
  type: "URL" | "VIN" | "TEXT" | "MANUAL" | "EXTENSION";
  url?: string | null;
  source?: AuctionSource | null;
  lotNumber?: string | null;
  vin?: string | null;
  text?: string | null;
  manual?: ManualListingInput | null;
  extension?: ExtensionCapture | null;
  uploadedPhotoUrls?: string[];
  analysisId: string;
}

function fromManual(m: ManualListingInput | null | undefined): RawListing | null {
  if (!m) return null;
  return {
    vin: m.vin ?? null,
    year: m.year ?? null,
    make: m.make ?? null,
    model: m.model ?? null,
    trim: m.trim ?? null,
    odometer: m.odometer ?? null,
    titleRaw: m.titleRaw ?? null,
    primaryDamage: m.primaryDamage ?? null,
    secondaryDamage: m.secondaryDamage ?? null,
    runConditionRaw: m.runCondition ?? null,
    hasKeys: m.hasKeys ?? null,
    currentBid: m.currentBid ?? null,
    listedRetailValue: m.listedRetailValue ?? null,
    saleDate: m.saleDate ?? null,
    location: { zip: m.zip ?? null, state: m.state ?? null, city: m.city ?? null, yardName: null },
  };
}

/** Text → listing: heuristic first, LLM when the heuristic result is thin and AI is configured. */
async function extractText(text: string, analysisId: string): Promise<{ raw: RawListing; method: NormalizedListing["extractionMethod"]; provider: string }> {
  const heuristic = heuristicExtract(text);
  if (features.ai() && extractionScore(heuristic) < 0.8) {
    try {
      const llm = await llmExtractListing(text, analysisId);
      return { raw: mergeRaw(llm, heuristic), method: "LLM", provider: "AI extraction" };
    } catch (err) {
      console.error("LLM extraction failed, using heuristic result", err);
    }
  }
  return { raw: heuristic, method: "PARSER", provider: "Text parser" };
}

function rawFromHints(h: UrlHints): RawListing {
  return {
    vin: h.vin,
    year: h.year,
    make: h.make,
    model: h.model,
    trim: h.trim,
    titleRaw: h.titleRaw,
    location: { zip: null, state: h.state, city: h.city, yardName: null },
  };
}

/** The lot's own link names its vehicle; that beats guessing from page text. */
function identityFromHints(h: UrlHints): RawListing | null {
  if (!hintsIdentifyVehicle(h)) return null;
  return { vin: h.vin, year: h.year, make: h.make, model: h.model, trim: h.trim };
}

/** Link details as form prefill, clipped to the form's limits. */
function prefillFromHints(hints: UrlHints) {
  const clip = (v: string | null, n: number) => (v ? v.slice(0, n) : null);
  return {
    vin: clip(hints.vin, 17),
    year: hints.year,
    make: clip(hints.make, 40),
    model: clip(hints.model, 60),
    trim: clip(hints.trim, 80),
    titleRaw: clip(hints.titleRaw, 80),
    state: clip(hints.state, 2),
    city: clip(hints.city, 60),
  };
}

/** Why the page couldn't be read, what we already know, and what the user should add. */
function needsDetails(source: AuctionSource | null | undefined, hints: UrlHints, fetchConfigured: boolean): NeedsInputError {
  const site = source && source !== "OTHER" && source !== "MANUAL" ? sourceLabel(source) : "This site";
  const why = fetchConfigured ? `${site} didn't return the listing to our page reader.` : `${site} blocks automatic reading of lot pages.`;
  const prefill = prefillFromHints(hints);
  if (hintsIdentifyVehicle(hints)) {
    return new NeedsInputError(
      `${why} From the link we have: ${describeHints(hints)}. Add the damage, odometer, current bid and the auction's estimated retail value from the lot page, or paste the whole page text.`,
      prefill,
    );
  }
  return new NeedsInputError(`${why} Paste the page text (on the lot page press Ctrl+A, then Ctrl+C), or fill in the details below.`, prefill);
}

/**
 * Listing provider chain: demo fixture → extension capture → scraping API (+ parsers + LLM)
 * → pasted text → manual form. Throws NeedsInputError when nothing identifies the vehicle.
 */
export async function fetchListing(req: ListingRequest, now: Date = new Date()): Promise<ProviderResult<NormalizedListing>> {
  const manualRaw = fromManual(req.manual);
  const uploaded = req.uploadedPhotoUrls ?? [];

  // 1. Demo fixtures
  if (features.demoMode() && req.lotNumber) {
    const fx = findDemoFixture(req.source ?? null, req.lotNumber);
    if (fx) return { data: fx.listing(now), provider: "Demo fixture", isDemo: true };
  }

  // 2. Browser-extension capture (the user's own page view)
  if (req.type === "EXTENSION" && req.extension) {
    const cap = req.extension;
    const fromHtml = cap.html ? extractFromHtml(cap.html, req.source ?? "OTHER", cap.url).raw : null;
    const text = await extractText(`${(cap.jsonLd ?? []).join("\n")}\n${cap.pageText}`, req.analysisId);
    const hints = hintsFromAuctionUrl(cap.url);
    const raw = mergeRaw(manualRaw, identityFromHints(hints), fromHtml, text.raw, rawFromHints(hints), { photoUrls: [...cap.imageUrls, ...uploaded] });
    raw.source = req.source ?? "OTHER";
    raw.sourceUrl = cap.url;
    raw.lotNumber = raw.lotNumber ?? req.lotNumber ?? null;
    const listing = finalizeListing(raw, "EXTENSION");
    if (!hasVehicleIdentity(listing)) {
      throw new NeedsInputError(
        "The extension couldn't find the year, make and model on that page. Fill in the details below, or paste the page text.",
        prefillFromHints(hints),
      );
    }
    return { data: listing, provider: "Browser extension", isDemo: false };
  }

  // 3. Pasted text (optionally with a URL / manual fields)
  if (req.text && req.text.trim().length > 0) {
    const t = await extractText(req.text, req.analysisId);
    const linkHints = req.url ? hintsFromAuctionUrl(req.url) : null;
    const raw = mergeRaw(manualRaw, linkHints && identityFromHints(linkHints), t.raw, linkHints && rawFromHints(linkHints), { photoUrls: uploaded });
    raw.source = req.source ?? raw.source ?? "OTHER";
    raw.sourceUrl = req.url ?? null;
    raw.lotNumber = raw.lotNumber ?? req.lotNumber ?? null;
    if (req.vin && !raw.vin) raw.vin = req.vin;
    const listing = finalizeListing(raw, t.method);
    if (!hasVehicleIdentity(listing)) throw new NeedsInputError("We couldn't find the VIN or year/make/model in that text. Add them in the form below.");
    return { data: listing, provider: t.provider, isDemo: false };
  }

  // 4. A link: details the user already gave → paid page reader → free direct read → ask
  if (req.type === "URL" && req.url) {
    const hints = hintsFromAuctionUrl(req.url);
    const withLinkDetails = (raw: RawListing) => {
      const merged = mergeRaw(raw, rawFromHints(hints), { photoUrls: uploaded });
      merged.source = req.source ?? "OTHER";
      merged.sourceUrl = req.url ?? null;
      merged.lotNumber = merged.lotNumber ?? req.lotNumber ?? null;
      return merged;
    };

    if (manualRaw && (manualRaw.primaryDamage || uploaded.length > 0)) {
      const listing = finalizeListing(withLinkDetails(manualRaw), "MANUAL");
      if (hasVehicleIdentity(listing)) return { data: listing, provider: "Manual entry", isDemo: false };
    }

    let page: Awaited<ReturnType<typeof fetchListingPage>> | null = null;
    if (features.scraping()) {
      try {
        page = await fetchListingPage(req.url);
      } catch (err) {
        console.error("Listing fetch via page reader failed", err);
      }
    }
    if (!page) {
      try {
        page = await fetchListingPageDirect(req.url);
      } catch (err) {
        console.warn("Direct listing read failed:", err instanceof Error ? err.message : err);
      }
    }
    if (page) {
      const html = extractFromHtml(page.html, req.source ?? "OTHER", req.url);
      let raw = mergeRaw(manualRaw, html.raw);
      let method: NormalizedListing["extractionMethod"] = "PARSER";
      let provider = page.provider;
      if (features.ai() && extractionScore(raw) < 0.8) {
        try {
          const llm = await llmExtractListing(`${html.title ?? ""}\n${html.pageText}`, req.analysisId);
          raw = mergeRaw(manualRaw, html.raw, llm);
          method = "LLM";
          provider = `${page.provider} + AI extraction`;
        } catch (err) {
          console.error("LLM extraction of fetched page failed", err);
        }
      }
      const listing = finalizeListing(withLinkDetails(raw), method);
      if (hasVehicleIdentity(listing) && (listing.primaryDamage || listing.photoUrls.length > 0)) return { data: listing, provider, isDemo: false };
    }
    throw needsDetails(req.source, hints, features.scraping());
  }

  // 5. VIN and/or manual form
  if (manualRaw || req.vin) {
    const raw = mergeRaw(manualRaw, { vin: req.vin ?? null, photoUrls: uploaded, source: "MANUAL" });
    const listing = finalizeListing(raw, "MANUAL");
    if (!listing.primaryDamage && uploaded.length === 0) {
      throw new NeedsInputError("Add the damage details (primary damage) or photos so we can estimate repairs — or paste the full listing text.");
    }
    return { data: listing, provider: "Manual entry", isDemo: false };
  }

  throw new NeedsInputError("Paste the listing text or fill in the vehicle details to continue.");
}
