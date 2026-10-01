import "server-only";

import zipcodes from "zipcodes";

export const ROAD_FACTOR = 1.18;
export const DEFAULT_DISTANCE_MILES = 500;

export function haversineMiles(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function zipPoint(zip: string | null | undefined): { lat: number; lon: number } | null {
  if (!zip) return null;
  const z = zipcodes.lookup(zip.slice(0, 5));
  return z ? { lat: z.latitude, lon: z.longitude } : null;
}

export function cityStatePoint(city: string | null | undefined, state: string | null | undefined): { lat: number; lon: number } | null {
  if (!city || !state) return null;
  const matches = zipcodes.lookupByName(city.trim(), state.trim().toUpperCase());
  const first = matches[0];
  return first ? { lat: first.latitude, lon: first.longitude } : null;
}

export function zipInfo(zip: string): { city: string; state: string } | null {
  const z = zipcodes.lookup(zip.slice(0, 5));
  return z ? { city: z.city, state: z.state } : null;
}

export interface DistanceResult {
  miles: number;
  method: "ZIP_CENTROID" | "CITY_STATE" | "DEFAULT";
}

/** Road-distance estimate between a yard and the buyer (haversine × 1.18). */
export function estimateDistance(
  from: { zip?: string | null; city?: string | null; state?: string | null },
  toZip: string | null,
): DistanceResult {
  const to = zipPoint(toZip);
  const fromZip = zipPoint(from.zip);
  const fromCity = fromZip ? null : cityStatePoint(from.city, from.state);
  const origin = fromZip ?? fromCity;
  if (!origin || !to) return { miles: DEFAULT_DISTANCE_MILES, method: "DEFAULT" };
  return { miles: Math.round(haversineMiles(origin, to) * ROAD_FACTOR), method: fromZip ? "ZIP_CENTROID" : "CITY_STATE" };
}
