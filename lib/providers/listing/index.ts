import "server-only";

import { llmExtractListing } from "@/lib/ai/prompts/extractListing";
import { features } from "@/lib/config/env";
import { findDemoFixture } from "@/lib/demo/fixtures";
import type { AuctionSource, NormalizedListing } from "@/lib/domain/schemas";

import { NeedsInputError, type ProviderResult } from "../types";
import { extractionScore, heuristicExtract } from "./heuristicExtract";
import { extractFromHtml } from "./htmlExtract";
import { finalizeListing, hasVehicleIdentity, mergeRaw, type RawListing } from "./normalize";
import { fetchListingPage } from "./scrapingApi";

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
    const raw = mergeRaw(manualRaw, fromHtml, text.raw, { photoUrls: [...cap.imageUrls, ...uploaded] });
    raw.source = req.source ?? "OTHER";
    raw.sourceUrl = cap.url;
    raw.lotNumber = raw.lotNumber ?? req.lotNumber ?? null;
    const listing = finalizeListing(raw, "EXTENSION");
    if (!hasVehicleIdentity(listing)) throw new NeedsInputError("The page didn't contain enough vehicle details. Paste the listing text instead.");
    return { data: listing, provider: "Browser extension", isDemo: false };
  }

  // 3. Pasted text (optionally with a URL / manual fields)
  if (req.text && req.text.trim().length > 0) {
    const t = await extractText(req.text, req.analysisId);
    const raw = mergeRaw(manualRaw, t.raw, { photoUrls: uploaded });
    raw.source = req.source ?? raw.source ?? "OTHER";
    raw.sourceUrl = req.url ?? null;
    raw.lotNumber = raw.lotNumber ?? req.lotNumber ?? null;
    if (req.vin && !raw.vin) raw.vin = req.vin;
    const listing = finalizeListing(raw, t.method);
    if (!hasVehicleIdentity(listing)) throw new NeedsInputError("We couldn't find the VIN or year/make/model in that text. Add them in the form below.");
    return { data: listing, provider: t.provider, isDemo: false };
  }

  // 4. Fetch the URL through the scraping provider
  if (req.type === "URL" && req.url) {
    if (!features.scraping()) {
      if (manualRaw && hasVehicleIdentity(finalizeListing(manualRaw, "MANUAL"))) {
        const raw = mergeRaw(manualRaw, { photoUrls: uploaded, source: req.source ?? "OTHER", sourceUrl: req.url, lotNumber: req.lotNumber ?? null });
        return { data: finalizeListing(raw, "MANUAL"), provider: "Manual entry", isDemo: false };
      }
      throw new NeedsInputError(
        "Automatic fetching isn't configured. Open the listing, press Ctrl+A then Ctrl+C, and paste the text here (or use the browser extension).",
      );
    }
    let page: Awaited<ReturnType<typeof fetchListingPage>>;
    try {
      page = await fetchListingPage(req.url);
    } catch (err) {
      console.error("Listing fetch failed", err);
      throw new NeedsInputError("The auction site didn't return the listing. Paste the listing text (Ctrl+A, Ctrl+C on the lot page) instead.");
    }
    const html = extractFromHtml(page.html, req.source ?? "OTHER", req.url);
    let raw = mergeRaw(manualRaw, html.raw, { photoUrls: uploaded });
    let method: NormalizedListing["extractionMethod"] = "PARSER";
    let provider = page.provider;
    if (features.ai() && extractionScore(raw) < 0.8) {
      try {
        const llm = await llmExtractListing(`${html.title ?? ""}\n${html.pageText}`, req.analysisId);
        raw = mergeRaw(manualRaw, html.raw, llm, { photoUrls: uploaded });
        method = "LLM";
        provider = `${page.provider} + AI extraction`;
      } catch (err) {
        console.error("LLM extraction of fetched page failed", err);
      }
    }
    raw.source = req.source ?? "OTHER";
    raw.sourceUrl = req.url;
    raw.lotNumber = raw.lotNumber ?? req.lotNumber ?? null;
    const listing = finalizeListing(raw, method);
    if (!hasVehicleIdentity(listing)) throw new NeedsInputError("The fetched page didn't include the vehicle details. Paste the listing text instead.");
    return { data: listing, provider, isDemo: false };
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
