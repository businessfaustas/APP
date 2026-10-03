/**
 * Regex/label extractor for auction listing text (what users get with Ctrl+A, Ctrl+C on
 * a lot page). Works without any AI key; the LLM extractor is preferred when available.
 */
import { parseMoney, parseOdometer } from "@/lib/domain/titles";
import { findVinInText } from "@/lib/input/parseInput";
import { MAKES } from "@/lib/input/urlHints";

import type { RawListing } from "./normalize";

type Field =
  | "vin"
  | "lot"
  | "odometer"
  | "title"
  | "primaryDamage"
  | "secondaryDamage"
  | "run"
  | "keys"
  | "engine"
  | "transmission"
  | "drive"
  | "fuel"
  | "color"
  | "saleDate"
  | "currentBid"
  | "buyNow"
  | "acv"
  | "location"
  | "seller"
  | "year"
  | "make"
  | "model"
  | "trim"
  | "saleStatus";

const LABELS: [Field, RegExp][] = [
  ["vin", /^vin(\s*\(status\))?(\s*number)?$/i],
  ["lot", /^(lot\s*#?|lot\s*number|stock\s*#?|stock\s*number|item\s*#?)$/i],
  ["odometer", /^(odometer|mileage|odometer\s*reading|miles)$/i],
  ["title", /^(title\s*code|sale\s*document|title\s*\/\s*sale\s*doc|doc(ument)?\s*type|document|title|title\s*type|title\s*status)$/i],
  ["primaryDamage", /^(primary\s*damage|damage|primary\s*dmg)$/i],
  ["secondaryDamage", /^(secondary\s*damage|secondary\s*dmg)$/i],
  ["run", /^(highlights|start\s*code|run\s*and\s*drive|condition|vehicle\s*condition|run\s*&\s*drive|drivability)$/i],
  ["keys", /^(keys?|has\s*keys|key\s*available)$/i],
  ["engine", /^(engine\s*type|engine)$/i],
  ["transmission", /^transmission$/i],
  ["drive", /^(drive|drive\s*line\s*type|drivetrain|drive\s*type)$/i],
  ["fuel", /^(fuel|fuel\s*type)$/i],
  ["color", /^(color|exterior\/interior|exterior\s*color)$/i],
  ["saleDate", /^(sale\s*date|auction\s*date(\s*and\s*time)?|sale\s*time|auction\s*start)$/i],
  ["currentBid", /^(current\s*bid|high\s*bid|bid|final\s*bid|current\s*price)$/i],
  ["buyNow", /^(buy\s*it\s*now|buy\s*now(\s*price)?)$/i],
  ["acv", /^(est\.?\s*retail\s*value|estimated\s*retail\s*value|acv|actual\s*cash\s*value|retail\s*value)$/i],
  ["location", /^(location|selling\s*branch|sale\s*location|yard|vehicle\s*location|branch|auction\s*location)$/i],
  ["seller", /^(seller|seller\s*type)$/i],
  ["saleStatus", /^(sale\s*status|sale\s*type)$/i],
  ["year", /^year$/i],
  ["make", /^make$/i],
  ["model", /^model$/i],
  ["trim", /^(trim|series)$/i],
];

function matchLabel(label: string): Field | null {
  const l = label.replace(/[:：]\s*$/, "").trim();
  if (l.length > 40) return null;
  for (const [field, re] of LABELS) if (re.test(l)) return field;
  return null;
}

/** Collects label → value pairs from "Label: value" and "Label\nvalue" layouts. */
export function collectPairs(text: string): Map<Field, string> {
  const pairs = new Map<Field, string>();
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\t+/g, " ").trim())
    .filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const colon = line.match(/^([^:：]{2,40})[:：]\s*(.+)$/);
    if (colon) {
      const field = matchLabel(colon[1]!);
      if (field && !pairs.has(field)) pairs.set(field, colon[2]!.replace(/^[:：\s]+/, "").trim());
      continue;
    }
    const field = matchLabel(line);
    const next = lines[i + 1];
    if (field && next && !matchLabel(next) && !pairs.has(field)) {
      pairs.set(field, next);
      i++;
    }
  }
  return pairs;
}

const US_STATES =
  "AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC";

export function parseLocation(raw: string): RawListing["location"] {
  const zip = raw.match(/\b(\d{5})(?:-\d{4})?\b/)?.[1] ?? null;
  // "TX - DALLAS SOUTH" (Copart) or "Dallas, TX 75236" or "Dallas (TX)"
  const copart = raw.match(new RegExp(`^(${US_STATES})\\s*-\\s*(.+)$`, "i"));
  if (copart) {
    return { yardName: raw.trim(), city: copart[2]!.replace(/\b(north|south|east|west)\b/gi, "").trim() || null, state: copart[1]!.toUpperCase(), zip };
  }
  const cityState = raw.match(new RegExp(`([A-Za-z .'-]+?)[,(\\s]+(${US_STATES})\\b`, "i"));
  if (cityState) {
    return { yardName: raw.trim(), city: cityState[1]!.trim(), state: cityState[2]!.toUpperCase(), zip };
  }
  return { yardName: raw.trim(), city: null, state: null, zip };
}

const isMake = (word: string) => {
  const w = word.toLowerCase();
  return MAKES.has(w.split(/[\s-]/)[0]!) || /^(land|alfa|aston|rolls)[\s-]/.test(w);
};

/**
 * "2019 AUDI A3 PREMIUM" headings. Whole lot pages start with menus and search boxes, so the
 * scan covers the page, takes the first line whose make is a real make, and skips footers.
 */
function parseYmm(text: string): Pick<RawListing, "year" | "make" | "model" | "trim"> {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  for (const l of lines.slice(0, 600)) {
    // Past this point pages list other cars.
    if (/^(similar|related|recommended|you may also|other vehicles|more like this)/i.test(l)) break;
    const m = l.match(/^(?:.*?\b)?((?:19|20)\d{2})\s+([A-Z][A-Za-z-]+(?:\s+(?:BENZ|ROVER|ROMEO|MARTIN))?)\s+([A-Za-z0-9-]+)(?:\s+(.{1,40}))?$/);
    if (m && isMake(m[2]!) && !/lot|vin|odometer|sale|©|copyright/i.test(l)) {
      const year = Number(m[1]);
      if (year >= 1980 && year <= new Date().getFullYear() + 1) {
        return { year, make: m[2]!, model: m[3]!, trim: m[4]?.replace(/[|•].*$/, "").trim() || null };
      }
    }
  }
  return {};
}

function parseKeys(raw: string): boolean | null {
  if (/^(yes|y|present|available|true)\b/i.test(raw)) return true;
  if (/^(no|n|missing|not\s*available|false)\b/i.test(raw)) return false;
  return null;
}

/** Extracts what it can from free listing text. */
export function heuristicExtract(text: string): RawListing {
  const pairs = collectPairs(text);
  const get = (f: Field) => pairs.get(f) ?? null;
  const ymm = parseYmm(text);
  const odoRaw = get("odometer");
  const titleRaw = get("title");
  const raw: RawListing = {
    vin: get("vin")?.match(/[A-HJ-NPR-Z0-9]{17}/i)?.[0] ?? findVinInText(text),
    lotNumber: get("lot")?.match(/[\w-]{5,12}/)?.[0] ?? null,
    year: get("year") ? Number(get("year")) : (ymm.year ?? null),
    make: get("make") ?? ymm.make ?? null,
    model: get("model") ?? ymm.model ?? null,
    trim: get("trim") ?? ymm.trim ?? null,
    odometer: parseOdometer(odoRaw),
    odometerUnit: odoRaw && /\bkm\b/i.test(odoRaw) ? "km" : "mi",
    odometerBrandRaw: odoRaw,
    titleRaw,
    titleState:
      titleRaw
        ?.match(/\(([A-Z]{2})\)|\b([A-Z]{2})\s*-/)
        ?.slice(1)
        .find(Boolean) ?? null,
    primaryDamage: get("primaryDamage"),
    secondaryDamage: get("secondaryDamage"),
    runConditionRaw: get("run") ?? text.match(/run\s*(and|&)\s*drive|engine\s*start(s)?|won'?t\s*start|stationary/i)?.[0] ?? null,
    hasKeys: get("keys") ? parseKeys(get("keys")!) : null,
    engine: get("engine"),
    transmission: get("transmission"),
    drive: get("drive"),
    fuel: get("fuel"),
    color: get("color"),
    saleDate: get("saleDate"),
    saleStatusRaw: get("saleStatus") ?? text.match(/on\s*approval|pure\s*sale|minimum\s*bid/i)?.[0] ?? null,
    currentBid: parseMoney(get("currentBid")),
    buyNowPrice: parseMoney(get("buyNow")),
    listedRetailValue: parseMoney(get("acv")),
    location: get("location") ? parseLocation(get("location")!) : undefined,
    sellerType: get("seller"),
  };
  if (raw.year !== null && raw.year !== undefined && Number.isNaN(raw.year)) raw.year = null;
  return raw;
}

/** How complete an extraction is (0–1), used to decide whether to call the LLM. */
export function extractionScore(r: RawListing): number {
  const checks = [r.vin, r.year, r.make, r.model, r.odometer, r.primaryDamage, r.titleRaw, r.currentBid ?? r.listedRetailValue, r.location?.state];
  return checks.filter((v) => v !== null && v !== undefined && v !== "").length / checks.length;
}
