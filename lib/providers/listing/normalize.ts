import {
  NormalizedListingSchema,
  type AuctionSource,
  type NormalizedListing,
} from "@/lib/domain/schemas";
import { normalizeOdometerBrand, normalizeRunCondition, normalizeSaleStatus, normalizeTitle } from "@/lib/domain/titles";
import { isVinFormat, normalizeVin } from "@/lib/input/vin";

/** Loose, provider-produced listing fields (strings where sources give strings). */
export interface RawListing {
  source?: AuctionSource;
  sourceUrl?: string | null;
  lotNumber?: string | null;
  vin?: string | null;
  year?: number | null;
  make?: string | null;
  model?: string | null;
  trim?: string | null;
  odometer?: number | null;
  odometerUnit?: "mi" | "km";
  odometerBrandRaw?: string | null;
  titleRaw?: string | null;
  titleState?: string | null;
  titleCategory?: NormalizedListing["titleCategory"] | null;
  primaryDamage?: string | null;
  secondaryDamage?: string | null;
  runConditionRaw?: string | null;
  hasKeys?: boolean | null;
  engine?: string | null;
  transmission?: string | null;
  drive?: string | null;
  fuel?: string | null;
  color?: string | null;
  saleDate?: string | null;
  saleStatusRaw?: string | null;
  currentBid?: number | null;
  buyNowPrice?: number | null;
  listedRetailValue?: number | null;
  location?: Partial<NormalizedListing["location"]>;
  sellerType?: string | null;
  photoUrls?: string[];
}

/** Merges partial results; earlier partials win for scalar fields, photos are unioned. */
export function mergeRaw(...parts: (RawListing | null | undefined)[]): RawListing {
  const out: RawListing = {};
  const photos: string[] = [];
  for (const p of parts) {
    if (!p) continue;
    for (const [k, v] of Object.entries(p) as [keyof RawListing, unknown][]) {
      if (k === "photoUrls") {
        for (const u of (v as string[] | undefined) ?? []) if (!photos.includes(u)) photos.push(u);
        continue;
      }
      if (k === "location") {
        const loc = (v ?? {}) as Partial<NormalizedListing["location"]>;
        out.location = {
          yardName: out.location?.yardName ?? loc.yardName ?? null,
          city: out.location?.city ?? loc.city ?? null,
          state: out.location?.state ?? loc.state ?? null,
          zip: out.location?.zip ?? loc.zip ?? null,
        };
        continue;
      }
      const current = out[k];
      if ((current === undefined || current === null || current === "") && v !== undefined && v !== null && v !== "") {
        (out as Record<string, unknown>)[k] = v;
      }
    }
  }
  out.photoUrls = photos;
  return out;
}

function cleanStr(s: string | null | undefined): string | null {
  if (!s) return null;
  const t = s.replace(/\s+/g, " ").trim();
  return t ? t : null;
}

function toIsoDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const t = Date.parse(raw);
  if (Number.isNaN(t)) return null;
  return new Date(t).toISOString();
}

/** Produces a schema-valid NormalizedListing from loose fields. */
export function finalizeListing(
  raw: RawListing,
  method: NormalizedListing["extractionMethod"],
  warnings: string[] = [],
): NormalizedListing {
  const vinRaw = raw.vin ? normalizeVin(raw.vin) : null;
  const vin = vinRaw && isVinFormat(vinRaw) ? vinRaw : null;
  const w = [...warnings];
  if (raw.vin && !vin) w.push(`Ignored an invalid VIN ("${raw.vin}").`);
  const titleCategory = raw.titleCategory ?? normalizeTitle(raw.titleRaw) ?? "UNKNOWN";
  const sourceUrl = raw.sourceUrl && /^https?:\/\//.test(raw.sourceUrl) ? raw.sourceUrl : null;
  const photoUrls = (raw.photoUrls ?? []).filter((u) => /^https?:\/\//.test(u) || u.startsWith("/") || u.startsWith("store:"));
  const listing: NormalizedListing = {
    source: raw.source ?? "OTHER",
    sourceUrl,
    lotNumber: cleanStr(raw.lotNumber),
    vin,
    year: raw.year && raw.year > 1950 && raw.year < 2100 ? raw.year : null,
    make: cleanStr(raw.make)?.toUpperCase() ?? null,
    model: cleanStr(raw.model)?.toUpperCase() ?? null,
    trim: cleanStr(raw.trim),
    odometer: raw.odometer !== undefined && raw.odometer !== null && raw.odometer >= 0 ? Math.round(raw.odometer) : null,
    odometerUnit: raw.odometerUnit ?? "mi",
    odometerBrand: normalizeOdometerBrand(raw.odometerBrandRaw),
    titleRaw: cleanStr(raw.titleRaw),
    titleState: cleanStr(raw.titleState)?.toUpperCase().slice(0, 2) ?? null,
    titleCategory,
    primaryDamage: cleanStr(raw.primaryDamage)?.toUpperCase() ?? null,
    secondaryDamage: cleanStr(raw.secondaryDamage)?.toUpperCase() ?? null,
    runCondition: normalizeRunCondition(raw.runConditionRaw),
    hasKeys: raw.hasKeys ?? null,
    engine: cleanStr(raw.engine),
    transmission: cleanStr(raw.transmission),
    drive: cleanStr(raw.drive),
    fuel: cleanStr(raw.fuel),
    color: cleanStr(raw.color),
    saleDate: toIsoDate(raw.saleDate),
    saleStatus: normalizeSaleStatus(raw.saleStatusRaw),
    currentBid: raw.currentBid ?? null,
    buyNowPrice: raw.buyNowPrice ?? null,
    listedRetailValue: raw.listedRetailValue ?? null,
    location: {
      yardName: cleanStr(raw.location?.yardName),
      city: cleanStr(raw.location?.city),
      state: cleanStr(raw.location?.state)?.toUpperCase() ?? null,
      zip: cleanStr(raw.location?.zip),
    },
    sellerType: cleanStr(raw.sellerType),
    photoUrls,
    extractionMethod: method,
    warnings: w,
  };
  return NormalizedListingSchema.parse(listing);
}

/** True when the listing identifies a vehicle well enough to analyze. */
export function hasVehicleIdentity(l: Pick<NormalizedListing, "vin" | "year" | "make" | "model">): boolean {
  return Boolean(l.vin) || Boolean(l.year && l.make && l.model);
}
