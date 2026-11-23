/**
 * Which car photo to show for a lot. The photos in public/cars are cut out and face right; each body type
 * has several, so a blue hatchback looks like a blue hatchback and a Tesla looks like a Tesla.
 * Pure and isomorphic: the same inputs always give the same photo, so server and browser render the same one.
 */
import type { BodyType } from "@/lib/vehicle/art";

export interface CarLook {
  src: string;
  /** width / height of the image file. */
  ratio: number;
  /** Rough paint colour of the car in the photo. */
  paint: string;
  /** If the lot's make/model text matches this, this is the photo for it. */
  match?: RegExp;
}

const SEDANS: CarLook[] = [
  { src: "/cars/sedan.webp", ratio: 900 / 336, paint: "#6e737c" },
  { src: "/cars/sedan-blue.webp", ratio: 900 / 347, paint: "#1d4c7e", match: /\baudi a3\b|\ba3\b/ },
];
const COUPES: CarLook[] = [
  { src: "/cars/coupe.webp", ratio: 760 / 250, paint: "#cddd3b" },
  { src: "/cars/coupe-orange.webp", ratio: 900 / 239, paint: "#d06a2b", match: /mclaren|\b[567]\d{2}s\b/ },
];
const SUVS: CarLook[] = [
  { src: "/cars/suv.webp", ratio: 900 / 343, paint: "#d68a2b", match: /\bq8\b|\baudi q/ },
  { src: "/cars/suv-volvo.webp", ratio: 900 / 348, paint: "#eceff3", match: /volvo|\bxc[469]0\b/ },
  { src: "/cars/suv-tesla.webp", ratio: 900 / 315, paint: "#eceff3", match: /tesla|\bmodel [3sxy]\b/ },
];

/**
 * The landing-page and sign-in showcase car: a wrecked sedan, so the AI scan has something to find. It is never picked
 * automatically (a real lot's picture should not show damage the report did not find); pass it as `look` to CarArt.
 */
export const HERO_LOOK: CarLook = { src: "/cars/sedan-wrecked.webp", ratio: 900 / 287, paint: "#eef0f3" };

/** There is no pickup photo yet: the SUVs stand in. */
export const CAR_LOOKS: Record<BodyType, CarLook[]> = { sedan: SEDANS, coupe: COUPES, suv: SUVS, pickup: SUVS };

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Squared distance between two #rrggbb colours (0 = identical). */
function distance(a: string, b: string): number {
  const [r1, g1, b1] = rgb(a);
  const [r2, g2, b2] = rgb(b);
  return (r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2;
}

function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * 1. a photo made for this make/model (the seed is the lot's make and model text);
 * 2. otherwise the photo closest to the listing's paint colour;
 * 3. when several are equally close (two white SUVs), one of them, chosen from the seed so it stays the same.
 */
export function pickCarLook(body: BodyType, paint?: string | null, seed?: string | null): CarLook {
  const looks = CAR_LOOKS[body];
  const text = (seed ?? "").toLowerCase();
  if (text) {
    const named = looks.find((l) => l.match?.test(text));
    if (named) return named;
  }
  if (!paint || !/^#[0-9a-f]{6}$/i.test(paint)) return looks[0]!;
  const ranked = looks.map((l) => ({ l, d: distance(paint, l.paint) })).sort((a, b) => a.d - b.d);
  const best = ranked[0]!.d;
  const ties = ranked.filter((r) => r.d <= best + 2500).map((r) => r.l);
  return ties[(text ? hash(text) : 0) % ties.length]!;
}
