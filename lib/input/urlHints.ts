/**
 * Vehicle details that can be read from an auction link itself, without opening the page.
 * Copart lot URLs carry a slug such as `salvage-2019-audi-a3-premium-tx-dallas`, and Bid.cars
 * URLs usually end in `2019-Audi-A3-<VIN>`. Used to prefill the form when the auction site
 * won't let the server read the page.
 */
import { isVinFormat } from "./vin";

export interface UrlHints {
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  titleRaw: string | null;
  state: string | null;
  city: string | null;
  vin: string | null;
}

const MULTI_WORD_MAKES = [
  ["mercedes", "benz"],
  ["land", "rover"],
  ["alfa", "romeo"],
  ["aston", "martin"],
  ["rolls", "royce"],
  ["mini", "cooper"],
];

/** Lower-case makes as they appear in slugs and listing headings. */
export const MAKES = new Set(
  (
    "acura audi bentley bmw buick cadillac chevrolet chevy chrysler dodge ferrari fiat ford genesis gmc honda hummer hyundai " +
    "infiniti isuzu jaguar jeep kia lamborghini lexus lincoln lucid maserati mazda mclaren mercedes mercury mini mitsubishi " +
    "nissan oldsmobile polestar pontiac porsche ram rivian saab saturn scion smart subaru suzuki tesla toyota volkswagen vw volvo"
  ).split(" "),
);

const STATES = new Set(
  (
    "al ak az ar ca co ct de fl ga hi id il in ia ks ky la me md ma mi mn ms mo mt ne nv nh nj nm ny nc nd oh ok or pa ri sc sd " +
    "tn tx ut vt va wa wv wi wy dc ab bc mb nb nl ns on pe qc sk"
  ).split(" "),
);

const YEAR = /^(19[89]\d|20[0-4]\d)$/;

const upper = (tokens: string[]) => tokens.join(" ").toUpperCase();
const titleCase = (tokens: string[]) => tokens.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(" ");

/** Reads year, make, model and trim starting at the year token; returns the index after the model. */
function vehicleFrom(tokens: string[], yearIdx: number): { make: string; model: string | null; trimStart: number } | null {
  let i = yearIdx + 1;
  const multi = MULTI_WORD_MAKES.find((m) => m.every((w, k) => tokens[i + k] === w));
  let make: string;
  if (multi) {
    make = multi.join("-") === "mercedes-benz" ? "MERCEDES-BENZ" : upper(multi);
    i += multi.length;
  } else if (tokens[i] && MAKES.has(tokens[i]!)) {
    make = tokens[i] === "chevy" ? "CHEVROLET" : tokens[i] === "vw" ? "VOLKSWAGEN" : tokens[i]!.toUpperCase();
    i += 1;
  } else {
    return null;
  }
  let model: string | null = null;
  const first = tokens[i];
  if (first) {
    const next = tokens[i + 1];
    // Hyphenated model names arrive split: f-150, cx-5, cr-v, rav-4.
    if (next && first.length <= 3 && /^[a-z]+$/.test(first) && /^[a-z0-9]{1,3}$/.test(next) && !STATES.has(next)) {
      model = `${first}-${next}`.toUpperCase();
      i += 2;
    } else {
      model = first.toUpperCase();
      i += 1;
    }
  }
  return { make, model, trimStart: i };
}

function empty(): UrlHints {
  return { year: null, make: null, model: null, trim: null, titleRaw: null, state: null, city: null, vin: null };
}

export function hintsFromAuctionUrl(rawUrl: string): UrlHints {
  const hints = empty();
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return hints;
  }
  const segments = url.pathname
    .split("/")
    .filter(Boolean)
    .map((s) => decodeURIComponent(s));

  // A VIN anywhere in the path (Bid.cars puts it at the end of the slug).
  for (const seg of segments) {
    const m = seg.toUpperCase().match(/(?:^|[-_])([A-HJ-NPR-Z0-9]{17})(?:$|[-_])/);
    if (m?.[1] && isVinFormat(m[1]) && /\d/.test(m[1]) && /[A-Z]/.test(m[1])) hints.vin = m[1];
  }

  for (const seg of segments) {
    const tokens = seg
      .toLowerCase()
      .split(/[-_\s]+/)
      .filter(Boolean);
    const yearIdx = tokens.findIndex((t) => YEAR.test(t));
    if (yearIdx < 0) continue;
    const vehicle = vehicleFrom(tokens, yearIdx);
    if (!vehicle) continue;

    hints.year = Number(tokens[yearIdx]);
    hints.make = vehicle.make;
    hints.model = vehicle.model;

    // Copart: <title words>-<year>-<make>-<model>-<trim…>-<state>-<city…>
    const rest = tokens.slice(vehicle.trimStart).filter((t) => t.toUpperCase() !== hints.vin);
    let stateIdx = -1;
    for (let k = rest.length - 2; k >= 0; k--) {
      if (STATES.has(rest[k]!)) {
        stateIdx = k;
        break;
      }
    }
    const trimTokens = stateIdx >= 0 ? rest.slice(0, stateIdx) : rest;
    if (trimTokens.length > 0 && trimTokens.length <= 4) hints.trim = upper(trimTokens);
    if (stateIdx >= 0) {
      hints.state = rest[stateIdx]!.toUpperCase();
      hints.city = titleCase(rest.slice(stateIdx + 1)) || null;
    }
    const titleTokens = tokens.slice(0, yearIdx);
    if (titleTokens.length > 0) hints.titleRaw = upper(titleTokens);
    break;
  }
  return hints;
}

/** True when the hints identify the vehicle well enough to prefill the form. */
export function hintsIdentifyVehicle(h: UrlHints): boolean {
  return Boolean(h.vin || (h.year && h.make && h.model));
}

/** "2019 AUDI A3 PREMIUM · salvage · Dallas, TX" — for messages. */
export function describeHints(h: UrlHints): string {
  const car = [h.year, h.make, h.model, h.trim].filter(Boolean).join(" ");
  const place = h.city && h.state ? `${h.city}, ${h.state}` : (h.state ?? "");
  return [car || (h.vin ? `VIN ${h.vin}` : ""), h.titleRaw?.toLowerCase(), place].filter(Boolean).join(" · ");
}
