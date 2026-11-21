/** What the car picture needs for a lot: a real photo if any, its silhouette, damaged areas and verdict tone. */
import type { DamageAssessment, DamageZone, NormalizedListing, VehicleInfo } from "@/lib/domain/schemas";
import { paintOf, type BodyType } from "@/lib/vehicle/art";

export interface LotVisual {
  photo: string | null;
  body: BodyType;
  zones: { zone: DamageZone; severity: number }[];
  tone: "go" | "caution" | "stop" | "neutral";
  /** Paint colour (#rrggbb) from the listing's colour. */
  paint: string;
}

const PICKUP = /pickup|truck|f-?150|f-?250|silverado|sierra|\bram\b|tacoma|tundra|ranger|frontier|colorado|titan|gladiator|cybertruck/;
const COUPE = /\bm[2-8]\b|\bmustang\b|camaro|corvette|challenger|supra|\b911\b|cayman|boxster|\bgt-?r\b|370z|400z|\bbrz\b|gr86|coupe|roadster|convertible/;
const SUV =
  /suv|sport utility|crossover|multipurpose|\bvan\b|wagon|rav4|cr-v|cx-5|x3|x5|q5|q7|explorer|tahoe|highlander|pilot|model y|outback|forester|wrangler|grand cherokee/;

export function bodyOf(listing: Pick<NormalizedListing, "make" | "model"> | null, vehicle: Pick<VehicleInfo, "bodyClass" | "vehicleClass"> | null): BodyType {
  const s = `${vehicle?.bodyClass ?? ""} ${listing?.make ?? ""} ${listing?.model ?? ""}`.toLowerCase();
  if (PICKUP.test(s)) return "pickup";
  if (SUV.test(s) || vehicle?.vehicleClass === "truck_suv") return "suv";
  if (COUPE.test(s)) return "coupe";
  return "sedan";
}

export function toneOf(verdict: string | null | undefined): LotVisual["tone"] {
  return verdict === "GO" ? "go" : verdict === "BE_CAUTIOUS" ? "caution" : verdict === "WALK_AWAY" ? "stop" : "neutral";
}

export function lotVisual(args: {
  listing: (Pick<NormalizedListing, "make" | "model"> & { color?: string | null }) | null;
  vehicle: Pick<VehicleInfo, "bodyClass" | "vehicleClass"> | null;
  damage: DamageAssessment | null;
  verdict: string | null | undefined;
  photo?: string | null;
}): LotVisual {
  const zones = new Map<DamageZone, number>();
  for (const z of args.damage?.impact_zones ?? []) zones.set(z.zone, Math.max(zones.get(z.zone) ?? 0, z.severity));
  return {
    photo: args.photo ?? null,
    body: bodyOf(args.listing, args.vehicle),
    zones: [...zones].map(([zone, severity]) => ({ zone, severity })),
    tone: toneOf(args.verdict),
    paint: paintOf(args.listing?.color),
  };
}

/** The URL a stored listing photo is served from (demo drawings are skipped; the artwork is nicer). */
export function photoUrl(p: { id: string; originalUrl: string | null; storagePath: string | null } | undefined): string | null {
  if (!p || p.originalUrl?.startsWith("/demo-photos/")) return null;
  return p.storagePath ? `/api/photos/${p.id}` : null;
}

/** The first photo the auction itself published (an https link), if the listing has one. */
export function auctionPhotoUrl(urls: readonly string[] | null | undefined): string | null {
  return urls?.find((u) => /^https:\/\//i.test(u)) ?? null;
}

/**
 * The picture for a lot: our stored copy of the first photo when we have one, otherwise the
 * auction's own image. `CarVisual` falls back to the illustration if that link doesn't load.
 */
export function lotPhoto(
  stored: { id: string; originalUrl: string | null; storagePath: string | null } | undefined,
  listing: Pick<NormalizedListing, "photoUrls"> | null | undefined,
): string | null {
  return photoUrl(stored) ?? auctionPhotoUrl(listing?.photoUrls);
}
