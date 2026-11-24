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
  /** The car in the photo is wrecked, so a demo scan can mark damage on it (and a clean car never gets markers). */
  damaged?: boolean;
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
export const HERO_LOOK: CarLook = { src: "/cars/sedan-wrecked.webp", ratio: 900 / 287, paint: "#eef0f3", damaged: true };

/** There is no pickup photo yet: the SUVs stand in. */
export const CAR_LOOKS: Record<BodyType, CarLook[]> = { sedan: SEDANS, coupe: COUPES, suv: SUVS, pickup: SUVS };

/**
 * The cars of the "lobby": the picture that switches between all of them on the landing page, the dashboard and while an
 * analysis runs. The wrecked showcase sedan leads; after it the body types alternate, so two similar cars never follow
 * each other.
 */
const LOBBY_ORDER = ["sedan-wrecked", "sedan-blue", "coupe-orange", "suv-tesla", "sedan", "suv-volvo", "coupe", "suv"] as const;
const EVERY_LOOK: CarLook[] = [HERO_LOOK, ...SEDANS, ...COUPES, ...SUVS];
export const LOBBY_LOOKS: CarLook[] = LOBBY_ORDER.map((name) => EVERY_LOOK.find((l) => l.src === `/cars/${name}.webp`)!);

/** The lobby with `first` moved to the front (so an analysis starts on the lot's own kind of car), or as it is. */
export function lobbyOrder(first?: CarLook | null): CarLook[] {
  return first ? [first, ...LOBBY_LOOKS.filter((l) => l.src !== first.src)] : LOBBY_LOOKS;
}

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
