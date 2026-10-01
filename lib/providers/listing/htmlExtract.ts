/**
 * Extracts listing data from auction HTML: JSON-LD, embedded lot JSON (Copart), label/value
 * DOM pairs, and photo URLs. Best effort — auction markup changes, so the pipeline falls
 * back to LLM extraction over the page text when this is incomplete.
 */
import * as cheerio from "cheerio";

import type { AuctionSource } from "@/lib/domain/schemas";
import { parseMoney } from "@/lib/domain/titles";

import { heuristicExtract, parseLocation } from "./heuristicExtract";
import { mergeRaw, type RawListing } from "./normalize";

const PHOTO_HOSTS = /(cs\.copart\.com|copart\.com\/.*\.(jpe?g|webp)|vis\.iaai\.com|iaai\.com\/.*image|resizer|bid\.cars\/.*\.(jpe?g|webp)|cdn\.bid\.cars|imgs?\.)/i;

function str(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return null;
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") return parseMoney(v);
  return null;
}

/** schema.org Vehicle / Car / Product in JSON-LD. */
export function parseJsonLd(blocks: string[]): RawListing {
  const out: RawListing = {};
  for (const block of blocks) {
    let data: unknown;
    try {
      data = JSON.parse(block);
    } catch {
      continue;
    }
    const items = Array.isArray(data) ? data : [data];
    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const o = item as Record<string, unknown>;
      const brand = o.brand as Record<string, unknown> | string | undefined;
      const odo = o.mileageFromOdometer as Record<string, unknown> | undefined;
      const imgs = Array.isArray(o.image) ? o.image : o.image ? [o.image] : [];
      Object.assign(
        out,
        mergeRaw(out, {
          vin: str(o.vehicleIdentificationNumber),
          make: typeof brand === "string" ? brand : str(brand?.name) ?? str(o.manufacturer),
          model: str(o.model),
          year: num(o.vehicleModelDate) ?? num(o.productionDate),
          odometer: odo ? num(odo.value) : null,
          color: str(o.color),
          fuel: str(o.fuelType),
          transmission: str(o.vehicleTransmission),
          photoUrls: imgs.map((i) => (typeof i === "string" ? i : str((i as Record<string, unknown>).url))).filter((u): u is string => Boolean(u)),
        }),
      );
    }
  }
  return out;
}

/**
 * Copart lot pages have historically embedded lot details as JSON (e.g. in
 * `cachedSolrLotDetailsJSON`). Keys are short codes; we map the commonly seen ones.
 */
export function parseCopartEmbedded(html: string): RawListing | null {
  const m = html.match(/cachedSolrLotDetailsJSON\s*=\s*"((?:[^"\\]|\\.)*)"/) ?? html.match(/"lotDetails"\s*:\s*(\{[\s\S]*?\})\s*[,}]/);
  if (!m?.[1]) return null;
  let obj: Record<string, unknown>;
  try {
    const rawJson = m[0].includes("cachedSolrLotDetailsJSON") ? JSON.parse(`"${m[1]}"`) : m[1];
    obj = JSON.parse(rawJson) as Record<string, unknown>;
  } catch {
    return null;
  }
  const yard = str(obj.yn) ?? str(obj.syn);
  return {
    lotNumber: str(obj.ln),
    vin: str(obj.fv),
    year: num(obj.lcy),
    make: str(obj.mkn),
    model: str(obj.lm) ?? str(obj.lmg),
    trim: str(obj.ltd) ?? str(obj.trim),
    odometer: num(obj.orr),
    odometerBrandRaw: str(obj.ord),
    titleRaw: str(obj.td) ?? str(obj.tgd),
    titleState: str(obj.ts),
    primaryDamage: str(obj.dd),
    secondaryDamage: str(obj.sdd),
    runConditionRaw: str(obj.lcd),
    hasKeys: str(obj.hk) ? /^y|yes|true/i.test(str(obj.hk)!) : null,
    engine: str(obj.egn),
    transmission: str(obj.tmtp),
    drive: str(obj.drv),
    fuel: str(obj.ft),
    color: str(obj.clr),
    saleDate: typeof obj.ad === "number" ? new Date(obj.ad).toISOString() : str(obj.ad),
    currentBid: num(obj.hb) ?? num(obj.dynamicLotDetails),
    buyNowPrice: num(obj.bnp),
    listedRetailValue: num(obj.la),
    location: yard ? { ...parseLocation(yard), zip: str(obj.yz) ?? parseLocation(yard)?.zip ?? null } : undefined,
    photoUrls: Array.isArray(obj.tims) ? (obj.tims as unknown[]).map(str).filter((u): u is string => Boolean(u)) : [],
  };
}

export interface HtmlExtraction {
  raw: RawListing;
  pageText: string;
  title: string | null;
}

export function extractFromHtml(html: string, source: AuctionSource, pageUrl: string | null): HtmlExtraction {
  const $ = cheerio.load(html);
  const jsonLd = $('script[type="application/ld+json"]')
    .map((_, el) => $(el).text())
    .get();
  const fromLd = parseJsonLd(jsonLd);
  const fromCopart = source === "COPART" ? parseCopartEmbedded(html) : null;

  // label/value pairs from definition lists and two-column tables
  const pairLines: string[] = [];
  $("dt").each((_, el) => {
    const v = $(el).next("dd").text().trim();
    if (v) pairLines.push(`${$(el).text().trim().replace(/[:：]$/, "")}: ${v}`);
  });
  $("tr").each((_, el) => {
    const cells = $(el).find("th,td");
    if (cells.length === 2) pairLines.push(`${$(cells[0]).text().trim().replace(/[:：]$/, "")}: ${$(cells[1]).text().trim()}`);
  });
  $("[class*='label'], [class*='Label'], [class*='title'], [data-uname*='label']").each((_, el) => {
    const label = $(el).text().trim();
    const value = $(el).next().text().trim();
    if (label && value && label.length < 40 && value.length < 120) pairLines.push(`${label}: ${value}`);
  });

  $("script,style,noscript,svg").remove();
  const pageText = $("body").text().replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
  const fromPairs = heuristicExtract(`${pairLines.join("\n")}\n${pageText.slice(0, 20000)}`);

  const imgs = new Set<string>();
  const og = $('meta[property="og:image"]').attr("content");
  if (og) imgs.add(og);
  $("img").each((_, el) => {
    for (const attr of ["data-full", "data-original", "data-src", "src", "hd-url", "full-url"]) {
      const v = $(el).attr(attr);
      if (v && PHOTO_HOSTS.test(v) && !/logo|icon|sprite|placeholder/i.test(v)) {
        try {
          imgs.add(new URL(v, pageUrl ?? undefined).toString());
        } catch {
          /* ignore malformed */
        }
      }
    }
  });

  const raw = mergeRaw(fromCopart, fromLd, fromPairs, { photoUrls: [...imgs] });
  raw.source = source;
  raw.sourceUrl = pageUrl;
  return { raw, pageText, title: $("title").text().trim() || null };
}
