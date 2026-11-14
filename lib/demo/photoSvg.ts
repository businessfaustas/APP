/**
 * Generates illustrative "DEMO PHOTO" SVGs (never real auction photos): the car in an auction
 * yard from the requested angle, with the damaged areas boxed the way a vision model reports them.
 */
import { carArtMarkup, paintOf, VIEW, type BodyType } from "@/lib/vehicle/art";

export type DemoView = "front" | "rear" | "left" | "right" | "front_left" | "rear_left" | "interior" | "engine_bay" | "roof" | "undercarriage";

export interface DemoPhotoSpec {
  view: DemoView;
  /** damage marks: which region of the view and how bad (1–3) */
  damage: { region: "left" | "center" | "right" | "top" | "bottom" | "all"; level: 1 | 2 | 3 }[];
  caption: string;
  color?: string;
  water?: boolean;
  fire?: boolean;
}

const W = 800;
const H = 450;
const GROUND = 338;

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

function shade(hex: string, target: string, t: number): string {
  const a = parseInt(hex.slice(1), 16);
  const b = parseInt(target.slice(1), 16);
  const ch = (s: number) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * t);
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
}

/** Sky, far fence line and wet asphalt: the same yard behind every exterior shot. */
function yard(): string {
  const posts = Array.from({ length: 21 }, (_, i) => `<path d="M${i * 40} 232 V262" stroke="#0e1220" stroke-width="2" opacity=".55"/>`).join("");
  return `<rect width="${W}" height="${H}" fill="url(#sky)"/>
<path d="M0 262 L60 246 L150 250 L210 232 L320 236 L390 244 L470 228 L560 234 L640 246 L720 238 L800 248 V270 H0 Z" fill="#141a2b" opacity=".85"/>
<path d="M0 240 H800" stroke="#0e1220" stroke-width="2" opacity=".5"/><path d="M0 252 H800" stroke="#0e1220" stroke-width="1.5" opacity=".4"/>${posts}
<rect y="262" width="${W}" height="${H - 262}" fill="url(#lot)"/>
<path d="M-40 450 L330 262 M840 450 L470 262 M240 450 L385 262 M560 450 L415 262" stroke="#fff" stroke-opacity=".05" stroke-width="2"/>`;
}

/** A plain dark studio for close-ups (interior, engine bay, underside). */
function bay(): string {
  return `<rect width="${W}" height="${H}" fill="url(#bay)"/>`;
}

function side(paint: string, body: BodyType, flip: boolean, zoom?: "front" | "rear"): string {
  const k = zoom ? 3.05 : 1.82;
  const focus = zoom === "front" ? 304 : zoom === "rear" ? 100 : 201;
  const tx = W / 2 - focus * k;
  const ty = (zoom ? 372 : GROUND) - VIEW.ground * k;
  const art = `<g transform="translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${k})">${carArtMarkup({ id: "car", body, paint })}</g>`;
  return flip ? `<g transform="translate(${W} 0) scale(-1 1)">${art}</g>` : art;
}

function headOn(paint: string, rear: boolean): string {
  const hi = shade(paint, "#ffffff", 0.45);
  const lo = shade(paint, "#05060a", 0.5);
  const lamps = rear
    ? `<path d="M232 252 L318 248 L314 270 L238 274 Z" fill="#e23b41"/><path d="M568 252 L482 248 L486 270 L562 274 Z" fill="#e23b41"/>
<rect x="352" y="262" width="96" height="30" rx="4" fill="#e8ebf0" stroke="#0b0d12" stroke-opacity=".5"/><path d="M318 259 H482" stroke="#e23b41" stroke-width="5" opacity=".7"/>
<rect x="286" y="322" width="34" height="9" rx="4.5" fill="#0b0d12"/><rect x="480" y="322" width="34" height="9" rx="4.5" fill="#0b0d12"/>`
    : `<path d="M232 250 L304 246 L298 268 L240 272 Z" fill="#fff8dc"/><path d="M568 250 L496 246 L502 268 L560 272 Z" fill="#fff8dc"/>
<ellipse cx="268" cy="260" rx="52" ry="20" fill="url(#lampglow)"/><ellipse cx="532" cy="260" rx="52" ry="20" fill="url(#lampglow)"/>
<path d="M322 248 H478 L468 284 H332 Z" fill="#0b0d12"/><path d="M328 258 H472 M331 268 H469 M334 277 H466" stroke="#3a3f4a" stroke-width="2"/>
<path d="M300 300 H500 L490 322 H310 Z" fill="#0b0d12" opacity=".9"/>`;
  return `<g transform="translate(400 ${GROUND + 8}) scale(1.34) translate(-400 ${-(GROUND + 8)})"><ellipse cx="400" cy="${GROUND + 6}" rx="240" ry="16" fill="url(#ground)"/>
<rect x="228" y="296" width="62" height="50" rx="10" fill="#0e0f13"/><rect x="510" y="296" width="62" height="50" rx="10" fill="#0e0f13"/>
<path d="M292 208 Q306 150 342 142 L458 142 Q494 150 508 208 Z" fill="${shade(paint, "#05060a", 0.15)}"/>
<path d="M304 204 Q316 160 346 153 L454 153 Q484 160 496 204 Z" fill="url(#glass)"/>
<path d="M330 204 L372 153 L398 153 L356 204 Z" fill="#fff" opacity=".08"/>
<path d="M262 198 l-24 -4 q-8 6 -2 14 l24 2 Z" fill="${lo}"/><path d="M538 198 l24 -4 q8 6 2 14 l-24 2 Z" fill="${lo}"/>
<path d="M276 210 Q400 196 524 210 L542 232 Q400 216 258 232 Z" fill="${hi}"/>
<path d="M222 334 Q212 298 222 262 Q230 236 258 232 Q400 216 542 232 Q570 236 578 262 Q588 298 578 334 Q400 344 222 334 Z" fill="url(#paint)"/>
<path d="M222 334 Q212 298 222 262 Q230 236 258 232 Q400 216 542 232 Q570 236 578 262 Q588 298 578 334" fill="none" stroke="#05060a" stroke-opacity=".5" stroke-width="1.5"/>
<path d="M226 296 Q400 288 574 296" stroke="#05060a" stroke-opacity=".3" stroke-width="2" fill="none"/>
${lamps}</g>`;
}

function interior(): string {
  return `<path d="M0 250 Q400 150 800 250 V450 H0 Z" fill="#1c1f29"/>
<path d="M40 262 Q400 176 760 262 L760 300 Q400 224 40 300 Z" fill="#2a2e3b"/>
<path d="M150 70 Q400 20 650 70 L700 232 Q400 150 100 232 Z" fill="url(#glass)" opacity=".8"/>
<path d="M260 60 L330 44 L250 214 L180 226 Z" fill="#fff" opacity=".05"/>
<rect x="352" y="244" width="190" height="96" rx="12" fill="#0d1018" stroke="#3a4051" stroke-width="2"/><rect x="364" y="256" width="166" height="60" rx="6" fill="#16223a"/>
<path d="M376 300 h44 M376 286 h70 M376 272 h56" stroke="#5d7bc4" stroke-width="4" stroke-linecap="round" opacity=".7"/>
<circle cx="236" cy="318" r="82" fill="none" stroke="#0b0d12" stroke-width="20"/><circle cx="236" cy="318" r="82" fill="none" stroke="#3a4051" stroke-width="2"/>
<path d="M160 318 H312 M236 318 V396" stroke="#0b0d12" stroke-width="16" stroke-linecap="round"/><circle cx="236" cy="318" r="24" fill="#12151d" stroke="#3a4051" stroke-width="2"/>
<rect x="580" y="262" width="150" height="46" rx="8" fill="#232733" stroke="#3a4051" stroke-width="1.5"/>
<path d="M60 450 L130 356 Q150 340 180 340 L318 340 Q340 342 348 366 L366 450 Z" fill="#2b2f3c"/><path d="M448 450 L466 366 Q474 342 496 340 L640 340 Q668 340 684 358 L752 450 Z" fill="#2b2f3c"/>
<path d="M130 356 Q230 372 348 366 M466 366 Q570 372 684 358" stroke="#3d4254" stroke-width="2" fill="none"/>`;
}

function engineBay(): string {
  return `<path d="M96 430 L150 120 Q156 96 180 96 H620 Q644 96 650 120 L704 430 Z" fill="#161922" stroke="#30364a" stroke-width="2"/>
<rect x="286" y="178" width="228" height="150" rx="16" fill="url(#metal)" stroke="#0b0d12" stroke-width="2"/>
<path d="M306 208 H494 M306 238 H494 M306 268 H494 M306 298 H494" stroke="#0b0d12" stroke-opacity=".45" stroke-width="5" stroke-linecap="round"/>
<rect x="176" y="150" width="84" height="64" rx="8" fill="#10131b" stroke="#3a4051" stroke-width="2"/><circle cx="198" cy="150" r="7" fill="#c0392b"/><circle cx="238" cy="150" r="7" fill="#2b2f3c"/>
<rect x="540" y="146" width="92" height="74" rx="10" fill="#e9edf5" opacity=".14" stroke="#aab1bd" stroke-opacity=".5" stroke-width="2"/><circle cx="586" cy="146" r="12" fill="#1f6fd6"/>
<circle cx="204" cy="300" r="34" fill="#232733" stroke="#3a4051" stroke-width="3"/><circle cx="204" cy="300" r="12" fill="#0b0d12"/>
<circle cx="596" cy="300" r="34" fill="#232733" stroke="#3a4051" stroke-width="3"/><circle cx="596" cy="300" r="12" fill="#0b0d12"/>
<rect x="150" y="364" width="500" height="34" rx="6" fill="#2a2f3d" stroke="#454c61" stroke-width="2"/>
<path d="M170 372 V390 M190 372 V390 M210 372 V390 M230 372 V390 M250 372 V390 M270 372 V390 M290 372 V390 M310 372 V390 M330 372 V390 M350 372 V390 M370 372 V390 M390 372 V390 M410 372 V390 M430 372 V390 M450 372 V390 M470 372 V390 M490 372 V390 M510 372 V390 M530 372 V390 M550 372 V390 M570 372 V390 M590 372 V390 M610 372 V390 M630 372 V390" stroke="#59607a" stroke-width="2"/>
<path d="M260 190 Q230 240 240 300 M540 190 Q570 240 560 300" stroke="#0b0d12" stroke-width="10" fill="none" stroke-linecap="round"/>`;
}

function topDown(paint: string): string {
  const lo = shade(paint, "#05060a", 0.3);
  return `<ellipse cx="400" cy="246" rx="330" ry="150" fill="url(#ground)" opacity=".8"/>
<rect x="108" y="124" width="584" height="236" rx="104" fill="url(#paint)" stroke="#05060a" stroke-opacity=".5" stroke-width="2"/>
<path d="M250 150 Q226 242 250 334 L300 318 Q286 242 300 166 Z" fill="url(#glass)"/><path d="M560 146 Q596 242 560 338 L500 320 Q518 242 500 164 Z" fill="url(#glass)"/>
<rect x="300" y="160" width="200" height="164" rx="22" fill="${shade(paint, "#ffffff", 0.2)}" stroke="#05060a" stroke-opacity=".25"/>
<path d="M566 148 Q680 172 690 242 Q680 312 566 336" fill="none" stroke="${lo}" stroke-width="2"/><path d="M246 152 Q124 176 112 242 Q124 308 246 332" fill="none" stroke="${lo}" stroke-width="2"/>
<path d="M512 136 l14 -16 h18 l-8 18 Z M512 348 l14 16 h18 l-8 -18 Z" fill="${lo}"/>
<path d="M320 176 H480" stroke="#fff" stroke-opacity=".35" stroke-width="3" stroke-linecap="round"/>`;
}

function underside(): string {
  return `<rect x="96" y="116" width="608" height="252" rx="46" fill="#12151d" stroke="#30364a" stroke-width="2"/>
<rect x="130" y="100" width="92" height="50" rx="12" fill="#0b0d12"/><rect x="130" y="334" width="92" height="50" rx="12" fill="#0b0d12"/><rect x="578" y="100" width="92" height="50" rx="12" fill="#0b0d12"/><rect x="578" y="334" width="92" height="50" rx="12" fill="#0b0d12"/>
<path d="M176 150 V334 M624 150 V334" stroke="#454c61" stroke-width="12" stroke-linecap="round"/>
<path d="M150 176 H650 M150 308 H650" stroke="#3a4051" stroke-width="16" stroke-linecap="round"/>
<rect x="470" y="196" width="130" height="92" rx="14" fill="url(#metal)" stroke="#0b0d12" stroke-width="2"/>
<path d="M470 242 H250 Q220 242 220 268 V300 H140" stroke="#7b8296" stroke-width="12" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
<rect x="236" y="286" width="86" height="30" rx="14" fill="#565d72" stroke="#0b0d12" stroke-width="2"/>
<rect x="250" y="190" width="150" height="40" rx="8" fill="#1c202b" stroke="#3a4051" stroke-width="2"/>`;
}

type Box = [number, number, number, number];
const REGION_BOX: Record<string, Box> = {
  left: [150, 206, 230, 160],
  center: [286, 190, 228, 176],
  right: [420, 206, 230, 160],
  top: [220, 110, 360, 130],
  bottom: [170, 268, 460, 120],
  all: [130, 110, 540, 270],
};
/** Close-ups of a corner: the damage is wherever that corner sits in the frame. */
const CORNER_BOX: Partial<Record<DemoView, Box>> = {
  front_left: [430, 196, 300, 170],
  rear_left: [70, 196, 300, 170],
};
const LEVEL_COLOR = ["#f5b83d", "#f5b83d", "#ff8a3d", "#ff4d4d"] as const;

/** A detection box (corner brackets, tinted fill) with a few scrape lines inside. */
function detection(view: DemoView, region: string, level: number, seed: number): string {
  const [x, y, w, h] = CORNER_BOX[view] ?? REGION_BOX[region] ?? REGION_BOX.center!;
  const c = LEVEL_COLOR[level] ?? LEVEL_COLOR[1];
  const L = 22;
  const corners = `M${x} ${y + L} V${y} H${x + L} M${x + w - L} ${y} H${x + w} V${y + L} M${x + w} ${y + h - L} V${y + h} H${x + w - L} M${x + L} ${y + h} H${x} V${y + h - L}`;
  const scrapes = Array.from({ length: level + 1 }, (_, i) => {
    const sx = x + w * (0.18 + ((i * 23 + seed * 7) % 55) / 100);
    const sy = y + h * (0.24 + ((i * 17 + seed * 5) % 50) / 100);
    const len = 26 + ((i * 13 + seed) % 5) * 9;
    return `<path d="M${sx.toFixed(0)} ${sy.toFixed(0)} l${len} ${(-6 + (i % 3) * 7).toFixed(0)}" stroke="#05060a" stroke-opacity=".4" stroke-width="2.4" stroke-linecap="round"/><path d="M${sx.toFixed(0)} ${(sy + 3).toFixed(0)} l${len} ${(-6 + (i % 3) * 7).toFixed(0)}" stroke="#fff" stroke-opacity=".3" stroke-width="1" stroke-linecap="round"/>`;
  }).join("");
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${c}" opacity="${(0.07 + level * 0.035).toFixed(3)}"/>${scrapes}
<path d="${corners}" fill="none" stroke="${c}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
<rect x="${x}" y="${y - 26}" width="98" height="20" rx="5" fill="${c}"/><text x="${x + 8}" y="${y - 11.5}" font-family="ui-sans-serif,system-ui,sans-serif" font-size="12" font-weight="700" fill="#14161c">DAMAGE ${level}/3</text>`;
}

export function renderDemoPhoto(spec: DemoPhotoSpec, index: number, opts: { body?: BodyType; paint?: string } = {}): string {
  const paint = spec.color && /^#[0-9a-f]{6}$/i.test(spec.color) ? spec.color : (opts.paint ?? paintOf(spec.color));
  const body = opts.body ?? "sedan";
  let scene: string;
  let exterior = true;
  switch (spec.view) {
    case "front":
      scene = headOn(paint, false);
      break;
    case "rear":
      scene = headOn(paint, true);
      break;
    case "front_left":
      scene = side(paint, body, false, "front");
      break;
    case "rear_left":
      scene = side(paint, body, false, "rear");
      break;
    case "left":
      scene = side(paint, body, true);
      break;
    case "right":
      scene = side(paint, body, false);
      break;
    case "roof":
      scene = topDown(paint);
      break;
    case "interior":
      scene = interior();
      exterior = false;
      break;
    case "engine_bay":
      scene = engineBay();
      exterior = false;
      break;
    case "undercarriage":
      scene = underside();
      exterior = false;
      break;
  }
  const marks = spec.damage.map((d, i) => detection(spec.view, d.region, d.level, index * 5 + i)).join("");
  const water = spec.water
    ? `<rect x="0" y="306" width="${W}" height="${H - 306}" fill="#38bdf8" opacity=".2"/><path d="M0 306 H${W}" stroke="#7dd3fc" stroke-width="2.5" stroke-dasharray="10 7"/><rect x="${W - 150}" y="280" width="132" height="20" rx="5" fill="#7dd3fc"/><text x="${W - 142}" y="294.5" font-family="ui-sans-serif,system-ui,sans-serif" font-size="12" font-weight="700" fill="#0b1220">WATER LINE</text>`
    : "";
  const fire = spec.fire ? `<rect width="${W}" height="${H}" fill="#120a06" opacity=".42"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(spec.caption)}">
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a2138"/><stop offset=".45" stop-color="#3a4668"/><stop offset=".6" stop-color="#7c86a6"/></linearGradient>
<linearGradient id="lot" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b3040"/><stop offset="1" stop-color="#14171f"/></linearGradient>
<radialGradient id="bay" cx=".5" cy=".4" r=".8"><stop offset="0" stop-color="#2a3044"/><stop offset="1" stop-color="#0c0e14"/></radialGradient>
<linearGradient id="paint" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(paint, "#ffffff", 0.4)}"/><stop offset=".5" stop-color="${paint}"/><stop offset="1" stop-color="${shade(paint, "#05060a", 0.55)}"/></linearGradient>
<linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#46587a"/><stop offset=".5" stop-color="#161b27"/><stop offset="1" stop-color="#2c3850"/></linearGradient>
<linearGradient id="metal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6d7488"/><stop offset="1" stop-color="#2e3342"/></linearGradient>
<radialGradient id="ground"><stop offset="0" stop-color="#000" stop-opacity=".6"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
<radialGradient id="lampglow"><stop offset="0" stop-color="#fff7d6" stop-opacity=".55"/><stop offset="1" stop-color="#fff7d6" stop-opacity="0"/></radialGradient>
<radialGradient id="vig" cx=".5" cy=".5" r=".75"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></radialGradient>
</defs>
${exterior ? yard() : bay()}
${scene}${water}${fire}${marks}
<rect width="${W}" height="${H}" fill="url(#vig)"/>
<rect x="${W - 76}" y="14" width="62" height="22" rx="6" fill="#05060a" opacity=".55"/><text x="${W - 45}" y="29.5" text-anchor="middle" font-family="ui-sans-serif,system-ui,sans-serif" font-size="12" font-weight="700" letter-spacing="1" fill="#fbbf24">DEMO</text>
</svg>`;
}
