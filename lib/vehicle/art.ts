/**
 * The car illustration, as SVG markup. One source for the React component (inline SVG, animated
 * by CSS classes) and for the demo "photo" images (static SVG files), so they always match.
 * Pure and isomorphic: only constants and numbers end up in the markup, never user text.
 */
import type { DamageZone } from "@/lib/domain/schemas";

export type BodyType = "sedan" | "suv" | "pickup" | "coupe";

/** The hand-drawn shapes cover three bodies; a coupe is drawn as a sedan in the demo-photo drawings. */
type DrawnBody = Exclude<BodyType, "coupe">;

interface Shape {
  /** Silhouette with both wheel arches cut out. */
  body: string;
  glass: string[];
  /** Wheel centres. */
  wheels: [number, number][];
  /** Tyre radius and arch radius. */
  r: number;
  arch: number;
  /** y of the sill (where the arches meet the body's lower edge). */
  sill: number;
  seams: string[];
  shoulder: string;
  handles: [number, number][];
  mirror: string;
  head: string;
  tail: string;
  intake: string;
  extras: string;
  /** Centres of the soft glow around the head and tail lamps. */
  headGlow: [number, number];
  tailGlow: [number, number];
}

export const VIEW = { w: 400, h: 180, ground: 152 } as const;

const SHAPES: Record<DrawnBody, Shape> = {
  sedan: {
    body: "M36 138 Q28 136 28 124 L30 102 Q31 95 40 93 L70 90 C96 74 122 57 156 53 C186 50 214 50 232 54 C254 60 270 74 288 88 C320 89 350 94 364 102 Q374 107 374 120 L373 132 Q372 138 364 138 L326.2 138 A28 28 0 1 0 273.8 138 L130.2 138 A28 28 0 1 0 77.8 138 Z",
    glass: ["M104 88 C120 74 138 65 158 61 L196 59 L196 88 Z", "M202 59 L227 59 C245 62 260 75 273 88 L202 88 Z"],
    wheels: [
      [104, 128],
      [300, 128],
    ],
    r: 24,
    arch: 28,
    sill: 138,
    seams: ["M199 89 L199 134", "M137 89 C139 98 136 104 133 108", "M270 89 C274 100 274 106 272 110"],
    shoulder: "M42 100 C120 95 250 94 358 104",
    handles: [
      [176, 97],
      [246, 97],
    ],
    mirror: "M272 86 L283 84.5 Q286.5 88 283 92 L273 92 Z",
    head: "M346 99.5 L369 105.5 Q371.5 108.5 369 111 L349 106.5 Z",
    tail: "M30 101 L47 96.5 L49 103 L30.5 108 Z",
    intake: "M350 126 L373.6 126 L373 131.5 L347 131.5 Z",
    extras: "",
    headGlow: [358, 105],
    tailGlow: [40, 102],
  },
  suv: {
    body: "M36 136 Q27 134 27 122 L29 90 Q30 78 36 68 L50 44 Q54 37 66 37 L220 36 C244 37 264 54 284 80 C318 82 350 88 364 98 Q375 104 375 118 L374 130 Q373 136 364 136 L328.3 136 A30 30 0 1 0 271.7 136 L128.3 136 A30 30 0 1 0 71.7 136 Z",
    glass: ["M58 76 L68 47 Q69 45 72 45 L104 44 L104 78 Z", "M110 44 L174 43 L174 79 L110 78 Z", "M180 43 L216 43 C238 45 254 60 268 79 L180 79 Z"],
    wheels: [
      [100, 126],
      [300, 126],
    ],
    r: 26,
    arch: 30,
    sill: 136,
    seams: ["M177 80 L177 132", "M107 79 L107 96", "M268 81 C272 92 272 98 270 104"],
    shoulder: "M32 92 C120 87 260 86 360 99",
    handles: [
      [150, 90],
      [232, 90],
    ],
    mirror: "M268 77 L281 75.5 Q284.5 79 281 83.5 L269 83.5 Z",
    head: "M347 93 L370 99.5 Q372.5 103 370 106.5 L350 102 Z",
    tail: "M30 80 L41 78 L41 97 L29 98 Z",
    intake: "M350 123 L374.6 123 L374 128.5 L347 128.5 Z",
    extras: `<path d="M70 34.5 L214 33.5" fill="none" stroke="#1a1c22" stroke-width="2.2" stroke-linecap="round"/>`,
    headGlow: [359, 100],
    tailGlow: [36, 88],
  },
  pickup: {
    body: "M34 136 Q26 134 26 124 L26 90 Q26 84 32 84 L166 84 L170 50 Q172 40 184 39 L244 38 C262 40 276 58 290 82 C322 84 352 88 366 98 Q376 104 376 118 L375 130 Q374 136 366 136 L333 136 A31 31 0 1 0 275 136 L127 136 A31 31 0 1 0 69 136 Z",
    glass: ["M179 80 L181 50 Q182 46 187 46 L216 45 L216 81 Z", "M222 45 L242 45 C256 47 268 62 280 81 L222 81 Z"],
    wheels: [
      [98, 125],
      [304, 125],
    ],
    r: 27,
    arch: 31,
    sill: 136,
    seams: ["M168 85 L168 134", "M219 82 L219 134", "M276 83 C280 96 279 104 277 112", "M36 88 L36 132"],
    shoulder: "M30 96 L164 95 M172 94 C230 90 300 90 362 100",
    handles: [
      [196, 92],
      [250, 92],
    ],
    mirror: "M280 78 L293 76.5 Q296.5 80 293 84.5 L281 84.5 Z",
    head: "M349 93 L371 99.5 Q373.5 103 371 107 L351 103 Z",
    tail: "M26 92 L35 92 L35 109 L26 109 Z",
    intake: "M352 123 L375.6 123 L375 128.5 L349 128.5 Z",
    extras: `<path d="M30 86.5 L166 86.5" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1"/>`,
    headGlow: [360, 100],
    tailGlow: [31, 100],
  },
};

/** Where each damage zone sits on the side view: cx, cy, rx, ry. */
const SPOTS: Record<DrawnBody, Record<DamageZone, [number, number, number, number]>> = {
  sedan: {
    front: [362, 118, 22, 18],
    front_left: [330, 102, 26, 18],
    front_right: [330, 102, 26, 18],
    rear: [40, 114, 20, 18],
    rear_left: [72, 102, 26, 16],
    rear_right: [72, 102, 26, 16],
    left_side: [200, 110, 58, 20],
    right_side: [200, 110, 58, 20],
    roof: [190, 52, 44, 6],
    engine_bay: [326, 95, 26, 8],
    undercarriage: [200, 142, 90, 6],
    interior: [196, 74, 40, 11],
  },
  suv: {
    front: [364, 114, 20, 18],
    front_left: [330, 98, 26, 18],
    front_right: [330, 98, 26, 18],
    rear: [34, 108, 16, 22],
    rear_left: [66, 96, 24, 18],
    rear_right: [66, 96, 24, 18],
    left_side: [190, 106, 60, 20],
    right_side: [190, 106, 60, 20],
    roof: [150, 37, 70, 6],
    engine_bay: [326, 88, 26, 9],
    undercarriage: [200, 141, 90, 6],
    interior: [180, 62, 50, 14],
  },
  pickup: {
    front: [366, 114, 20, 18],
    front_left: [334, 98, 26, 16],
    front_right: [334, 98, 26, 16],
    rear: [32, 110, 14, 20],
    rear_left: [70, 100, 30, 14],
    rear_right: [70, 100, 30, 14],
    left_side: [222, 108, 50, 20],
    right_side: [222, 108, 50, 20],
    roof: [214, 39, 34, 6],
    engine_bay: [328, 90, 26, 9],
    undercarriage: [200, 141, 90, 6],
    interior: [228, 64, 30, 14],
  },
};

const PAINTS: [RegExp, string][] = [
  [/white|pearl|ivory|balt/i, "#e8ebf0"],
  [/black|juod/i, "#262a32"],
  [/silver|sidabr/i, "#b4bac6"],
  [/charcoal|graphite|gunmetal/i, "#4b505c"],
  [/gr[ae]y|pilk/i, "#7c8494"],
  [/burgundy|maroon|wine/i, "#6f1f2c"],
  [/red|raudon/i, "#b5262e"],
  [/navy/i, "#1f3566"],
  [/blue|mėlyn/i, "#2c5fbd"],
  [/green|žali/i, "#2d6b50"],
  [/orange|oranž/i, "#d2632a"],
  [/yellow|gelton/i, "#dfb637"],
  [/gold|beige|tan|cream|champagne|smėl/i, "#c8b48c"],
  [/brown|bronze|rud/i, "#6c4b38"],
  [/purple|violet/i, "#5a3d8c"],
];

/** Paint colour for a listing's colour name; silver when unknown. */
export function paintOf(color: string | null | undefined): string {
  if (color) {
    if (/^#[0-9a-f]{6}$/i.test(color)) return color;
    for (const [re, hex] of PAINTS) if (re.test(color)) return hex;
  }
  return "#aab1bd";
}

function mix(hex: string, target: string, t: number): string {
  const a = parseInt(hex.slice(1), 16);
  const b = parseInt(target.slice(1), 16);
  const ch = (shift: number) => {
    const x = (a >> shift) & 255;
    const y = (b >> shift) & 255;
    return Math.round(x + (y - x) * t);
  };
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
}

const n = (v: number) => Math.round(v * 10) / 10;

function wheel(cx: number, cy: number, r: number, id: string): string {
  const rim = r * 0.7;
  const spokes = Array.from({ length: 7 }, (_, i) => {
    const a = ((-90 + (i * 360) / 7) * Math.PI) / 180;
    const x = cx + Math.cos(a) * (rim - 1.2);
    const y = cy + Math.sin(a) * (rim - 1.2);
    return `<path d="M${n(cx)} ${n(cy)} L${n(x)} ${n(y)}" stroke="url(#${id}-spoke)" stroke-width="${n(r * 0.115)}" stroke-linecap="round"/>`;
  }).join("");
  return `<g>
<circle cx="${cx}" cy="${cy}" r="${r}" fill="#0e0f13"/>
<circle cx="${cx}" cy="${cy}" r="${n(r - 1.4)}" fill="none" stroke="#2b2e37" stroke-width="1"/>
<circle cx="${cx}" cy="${cy}" r="${n(rim)}" fill="#16181e"/>
<circle cx="${cx}" cy="${cy}" r="${n(rim * 0.62)}" fill="#3b3f4a"/>
<circle cx="${cx}" cy="${cy}" r="${n(rim * 0.62)}" fill="none" stroke="#565b68" stroke-width="0.8"/>
${spokes}
<circle cx="${cx}" cy="${cy}" r="${n(rim)}" fill="none" stroke="url(#${id}-rim)" stroke-width="2"/>
<circle cx="${cx}" cy="${cy}" r="${n(r * 0.16)}" fill="#dfe3ea" stroke="#8d93a0" stroke-width="0.8"/>
</g>`;
}

export interface CarArtOptions {
  /** Prefix for gradient and clip ids; must be unique per SVG on a page. */
  id: string;
  body?: BodyType;
  /** Paint colour as #rrggbb (see paintOf). */
  paint?: string;
  zones?: { zone: DamageZone; severity: number }[];
  /** CSS colour of the glow under the car (the verdict's colour); omitted = none. */
  glow?: string;
  scanning?: boolean;
  /** Ground shadow under the car. */
  shadow?: boolean;
}

/** Inner markup for an `<svg viewBox="0 0 400 180">`. */
export function carArtMarkup(o: CarArtOptions): string {
  const id = o.id;
  const kind: DrawnBody = o.body === "coupe" ? "sedan" : (o.body ?? "sedan");
  const s = SHAPES[kind];
  const paint = o.paint ?? "#aab1bd";
  const hits = (o.zones ?? []).filter((z) => z.severity > 0);
  const top = mix(paint, "#ffffff", 0.5);
  const low = mix(paint, "#05060a", 0.5);
  const lower = mix(paint, "#05060a", 0.72);

  const defs = `<defs>
<linearGradient id="${id}-paint" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset=".3" stop-color="${mix(paint, "#ffffff", 0.12)}"/><stop offset=".56" stop-color="${paint}"/><stop offset=".86" stop-color="${low}"/><stop offset="1" stop-color="${lower}"/></linearGradient>
<linearGradient id="${id}-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a4760"/><stop offset=".42" stop-color="#171c28"/><stop offset=".6" stop-color="#10141d"/><stop offset="1" stop-color="#2a3449"/></linearGradient>
<linearGradient id="${id}-rim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4f6fa"/><stop offset=".5" stop-color="#8f96a4"/><stop offset="1" stop-color="#d8dce4"/></linearGradient>
<linearGradient id="${id}-spoke" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eef0f5"/><stop offset="1" stop-color="#9aa1ae"/></linearGradient>
<linearGradient id="${id}-sheen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<radialGradient id="${id}-shadow"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset=".6" stop-color="#000" stop-opacity=".25"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
<radialGradient id="${id}-halo"><stop offset="0" stop-color="${o.glow ?? "#000"}" stop-opacity=".42"/><stop offset=".65" stop-color="${o.glow ?? "#000"}" stop-opacity=".1"/><stop offset="1" stop-color="${o.glow ?? "#000"}" stop-opacity="0"/></radialGradient>
<radialGradient id="${id}-hit"><stop offset="0" stop-color="#ff3b3b" stop-opacity=".9"/><stop offset=".5" stop-color="#ff3b3b" stop-opacity=".4"/><stop offset="1" stop-color="#ff3b3b" stop-opacity="0"/></radialGradient>
<radialGradient id="${id}-lamp"><stop offset="0" stop-color="#fff7d6" stop-opacity=".9"/><stop offset="1" stop-color="#fff7d6" stop-opacity="0"/></radialGradient>
<radialGradient id="${id}-brake"><stop offset="0" stop-color="#ff4d4d" stop-opacity=".8"/><stop offset="1" stop-color="#ff4d4d" stop-opacity="0"/></radialGradient>
<linearGradient id="${id}-beam" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7c8cff" stop-opacity="0"/><stop offset=".46" stop-color="#7c8cff" stop-opacity=".3"/><stop offset=".5" stop-color="#e6e9ff" stop-opacity=".9"/><stop offset=".54" stop-color="#7c8cff" stop-opacity=".3"/><stop offset="1" stop-color="#7c8cff" stop-opacity="0"/></linearGradient>
<linearGradient id="${id}-fadeg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<mask id="${id}-fade"><rect x="0" y="${VIEW.ground}" width="400" height="${VIEW.h - VIEW.ground}" fill="url(#${id}-fadeg)"/></mask>
<clipPath id="${id}-clip"><path d="${s.body}"/></clipPath>
<clipPath id="${id}-gclip">${s.glass.map((d) => `<path d="${d}"/>`).join("")}</clipPath>
</defs>`;

  const reflection = `<g mask="url(#${id}-fade)" opacity=".16"><g transform="translate(0 ${VIEW.ground * 2}) scale(1 -1)"><path d="${s.body}" fill="${paint}"/>${s.wheels.map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="${s.r}" fill="#0e0f13"/><circle cx="${cx}" cy="${cy}" r="${n(s.r * 0.7)}" fill="#8f96a4"/>`).join("")}</g></g>`;
  const ground =
    o.shadow === false
      ? ""
      : `${o.glow ? `<ellipse cx="201" cy="${VIEW.ground + 3}" rx="192" ry="24" fill="url(#${id}-halo)"/>` : ""}
<ellipse cx="201" cy="${VIEW.ground + 1}" rx="176" ry="7" fill="url(#${id}-shadow)"/>${reflection}`;

  const wells = s.wheels
    .map(([cx, cy]) => {
      const dx = Math.sqrt(s.arch * s.arch - (s.sill - cy) * (s.sill - cy));
      return `<path d="M${n(cx + dx)} ${s.sill} A${s.arch} ${s.arch} 0 1 0 ${n(cx - dx)} ${s.sill} Z" fill="#07080b"/>`;
    })
    .join("");

  const body = `<path d="${s.body}" fill="url(#${id}-paint)"/>
<g clip-path="url(#${id}-clip)">
<path d="M0 ${s.sill - 8} H400 V${s.sill + 2} H0 Z" fill="#05060a" opacity=".32"/>
<path d="${s.shoulder}" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.3" stroke-linecap="round"/>
<path d="${s.shoulder}" fill="none" stroke="#000" stroke-opacity=".22" stroke-width="1.2" transform="translate(0 2.2)"/>
<path d="${s.intake}" fill="#0b0c10" opacity=".85"/>
</g>
<path d="${s.body}" fill="none" stroke="${mix(paint, "#05060a", 0.62)}" stroke-width="1" stroke-linejoin="round"/>
${s.extras}`;

  const glass = `${s.glass.map((d) => `<path d="${d}" fill="#0c0e13" stroke="#0c0e13" stroke-width="3.4" stroke-linejoin="round"/>`).join("")}
${s.glass.map((d) => `<path d="${d}" fill="url(#${id}-glass)"/>`).join("")}
<g clip-path="url(#${id}-gclip)"><path d="M168 30 L196 30 L150 100 L122 100 Z" fill="#fff" opacity=".1"/><path d="M204 30 L214 30 L168 100 L158 100 Z" fill="#fff" opacity=".07"/><path d="M40 40 H360 V58 H40 Z" fill="url(#${id}-sheen)" opacity=".22"/></g>`;

  const details = `${s.seams.map((d) => `<path d="${d}" fill="none" stroke="#05060a" stroke-opacity=".42" stroke-width="1.1" stroke-linecap="round"/>`).join("")}
${s.handles.map(([x, y]) => `<rect x="${x}" y="${y}" width="13" height="3.2" rx="1.6" fill="#05060a" opacity=".5"/><rect x="${x}" y="${y}" width="13" height="1.2" rx=".6" fill="#fff" opacity=".35"/>`).join("")}
<path d="${s.mirror}" fill="${mix(paint, "#05060a", 0.35)}" stroke="#05060a" stroke-opacity=".5" stroke-width=".8"/>
<g clip-path="url(#${id}-clip)"><ellipse cx="${s.headGlow[0]}" cy="${s.headGlow[1]}" rx="17" ry="9" fill="url(#${id}-lamp)" opacity=".8"/><ellipse cx="${s.tailGlow[0]}" cy="${s.tailGlow[1]}" rx="15" ry="9" fill="url(#${id}-brake)" opacity=".75"/></g>
<path d="${s.head}" fill="#fff8dc"/>
<path d="${s.tail}" fill="#e23b41"/>`;

  const wheels = s.wheels.map(([cx, cy]) => wheel(cx, cy, s.r, id)).join("");

  const damage = hits
    .map((h) => {
      const [cx, cy, rx, ry] = SPOTS[kind][h.zone];
      const k = 0.8 + Math.min(10, h.severity) / 18;
      const clip = h.zone === "undercarriage" ? "" : ` clip-path="url(#${id}-clip)"`;
      return `<g${clip}><ellipse class="glow-pulse" cx="${cx}" cy="${cy}" rx="${n(rx * k)}" ry="${n(ry * k)}" fill="url(#${id}-hit)"/></g>`;
    })
    .join("");
  const markers = hits
    .map((h) => {
      const [cx, cy] = SPOTS[kind][h.zone];
      return `<circle class="ping" cx="${cx}" cy="${cy}" r="5" fill="none" stroke="#ff4d4d" stroke-width="1.4"/><circle cx="${cx}" cy="${cy}" r="3.6" fill="#ff4040" stroke="#fff" stroke-width="1.5"/>`;
    })
    .join("");

  const scan = o.scanning ? `<g clip-path="url(#${id}-clip)"><rect class="scan" x="0" y="20" width="96" height="140" fill="url(#${id}-beam)"/></g>` : "";

  return `${defs}${ground}${wells}${body}${glass}${details}${wheels}${damage}${scan}${markers}`;
}

/**
 * Where a damage zone sits on a side view of the car, as fractions of the car's own box
 * (x: 0 = rear bumper, 1 = front bumper; y: 0 = roof, 1 = bottom of the tyres), plus the size of
 * its glow as fractions of the car's width. Derived from the drawn side view, so the markers on the
 * real car photos land in the same places.
 */
export function damageSpot(body: BodyType, zone: DamageZone): { x: number; y: number; w: number } {
  const [cx, cy, rx] = SPOTS[body === "coupe" ? "sedan" : body][zone];
  // the drawn car spans x 28..374 and y 50..ground
  return {
    x: Math.min(1, Math.max(0, (cx - 28) / 346)),
    y: Math.min(1, Math.max(0, (cy - 50) / (VIEW.ground - 50))),
    w: (rx * 2) / 346,
  };
}
