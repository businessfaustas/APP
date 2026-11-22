/**
 * Auction times belong to a yard, so a sale at "10:00 AM" in Houston is 10:00 in Houston's zone,
 * whoever is looking. Listings usually print the time without a zone, and the server runs in
 * UTC, so reading it naively puts it hours off. These helpers read a zone-less time in the
 * yard's zone and always show a time together with its zone name, so a buyer in London sees
 * "8:00 AM EDT" and cannot mistake it for local time.
 */

/** Dominant IANA zone of each US state (states that span two zones use the one most yards are in). */
const US_STATE_TZ: Record<string, string> = {
  AL: "America/Chicago",
  AK: "America/Anchorage",
  AZ: "America/Phoenix",
  AR: "America/Chicago",
  CA: "America/Los_Angeles",
  CO: "America/Denver",
  CT: "America/New_York",
  DE: "America/New_York",
  DC: "America/New_York",
  FL: "America/New_York",
  GA: "America/New_York",
  HI: "Pacific/Honolulu",
  ID: "America/Boise",
  IL: "America/Chicago",
  IN: "America/Indiana/Indianapolis",
  IA: "America/Chicago",
  KS: "America/Chicago",
  KY: "America/New_York",
  LA: "America/Chicago",
  ME: "America/New_York",
  MD: "America/New_York",
  MA: "America/New_York",
  MI: "America/Detroit",
  MN: "America/Chicago",
  MS: "America/Chicago",
  MO: "America/Chicago",
  MT: "America/Denver",
  NE: "America/Chicago",
  NV: "America/Los_Angeles",
  NH: "America/New_York",
  NJ: "America/New_York",
  NM: "America/Denver",
  NY: "America/New_York",
  NC: "America/New_York",
  ND: "America/Chicago",
  OH: "America/New_York",
  OK: "America/Chicago",
  OR: "America/Los_Angeles",
  PA: "America/New_York",
  RI: "America/New_York",
  SC: "America/New_York",
  SD: "America/Chicago",
  TN: "America/Chicago",
  TX: "America/Chicago",
  UT: "America/Denver",
  VT: "America/New_York",
  VA: "America/New_York",
  WA: "America/Los_Angeles",
  WV: "America/New_York",
  WI: "America/Chicago",
  WY: "America/Denver",
};

export function zoneForState(state: string | null | undefined): string | null {
  return (state && US_STATE_TZ[state.trim().toUpperCase()]) || null;
}

/** Milliseconds the zone is ahead of UTC at the given instant (negative for the Americas). */
export function zoneOffsetMs(timeZone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const n = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  const asUtc = Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"), n("second"));
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

const HAS_ZONE = /(?:\bZ|[+-]\d{2}:?\d{2}|\b(?:UTC|GMT|UT|[ECMP][SD]T|AKST|AKDT|HST))\s*$/i;

/**
 * Turns the date text of a listing into an exact instant (ISO string). Text that names its own
 * zone ("… CDT", "…Z", "+02:00") is taken at its word; text without one is read as wall-clock
 * time in the yard's zone, or as UTC when the zone is unknown (so the result never depends on
 * where the server happens to run).
 */
export function parseSaleDate(raw: string | null | undefined, state?: string | null): string | null {
  if (!raw) return null;
  const text = raw.trim();
  if (HAS_ZONE.test(text)) {
    const t = Date.parse(text);
    return Number.isNaN(t) ? null : new Date(t).toISOString();
  }
  const wall = Date.parse(`${text} UTC`);
  const fallback = Number.isNaN(wall) ? Date.parse(text) : wall;
  if (Number.isNaN(fallback)) return null;
  const zone = zoneForState(state);
  if (!zone || Number.isNaN(wall)) return new Date(fallback).toISOString();
  // The wall-clock reading is the local time; subtract the zone's offset at that moment (twice, so a
  // time near a daylight-saving change still lands on the right side of it).
  let instant = wall - zoneOffsetMs(zone, new Date(wall));
  instant = wall - zoneOffsetMs(zone, new Date(instant));
  return new Date(instant).toISOString();
}

/** "Oct 3, 2026, 10:00 AM CDT": the time in the yard's zone, with the zone named. */
export function formatSaleDate(d: Date | string | null | undefined, locale = "en-US", state?: string | null): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  const timeZone = zoneForState(state) ?? "UTC";
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
    timeZoneName: "short",
  }).format(date);
}
