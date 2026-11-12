/** What the car picture needs for a lot: a real photo if any, its silhouette, damaged areas and verdict tone. */
import type { DamageAssessment, DamageZone, NormalizedListing, VehicleInfo } from "@/lib/domain/schemas";

export interface LotVisual {
  photo: string | null;
  body: "sedan" | "suv" | "pickup";
  zones: { zone: DamageZone; severity: number }[];
  tone: "go" | "caution" | "stop" | "neutral";
}

const PICKUP = /pickup|truck|f-?150|f-?250|silverado|sierra|\bram\b|tacoma|tundra|ranger|frontier|colorado|titan|gladiator|cybertruck/;
const SUV =
  /suv|sport utility|crossover|multipurpose|\bvan\b|wagon|rav4|cr-v|cx-5|x3|x5|q5|q7|explorer|tahoe|highlander|pilot|model y|outback|forester|wrangler|grand cherokee/;

export function bodyOf(
  listing: Pick<NormalizedListing, "make" | "model"> | null,
  vehicle: Pick<VehicleInfo, "bodyClass" | "vehicleClass"> | null,
): LotVisual["body"] {
  const s = `${vehicle?.bodyClass ?? ""} ${listing?.make ?? ""} ${listing?.model ?? ""}`.toLowerCase();
  if (PICKUP.test(s)) return "pickup";
  if (SUV.test(s) || vehicle?.vehicleClass === "truck_suv") return "suv";
  return "sedan";
}

export function toneOf(verdict: string | null | undefined): LotVisual["tone"] {
  return verdict === "GO" ? "go" : verdict === "BE_CAUTIOUS" ? "caution" : verdict === "WALK_AWAY" ? "stop" : "neutral";
}

export function lotVisual(args: {
  listing: Pick<NormalizedListing, "make" | "model"> | null;
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
  };
}

/** The URL a stored listing photo is served from (demo drawings are skipped; the artwork is nicer). */
export function photoUrl(p: { id: string; originalUrl: string | null; storagePath: string | null } | undefined): string | null {
  if (!p || p.originalUrl?.startsWith("/demo-photos/")) return null;
  return p.storagePath ? `/api/photos/${p.id}` : null;
}
