/**
 * Generates illustrative "DEMO PHOTO" SVGs (never real auction photos): a stylized car
 * from the requested angle with the damaged zones marked.
 */
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

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

function sideCar(color: string, flip: boolean): string {
  const t = flip ? ` transform="translate(800,0) scale(-1,1)"` : "";
  return `<g${t}>
  <path d="M110 330 L130 270 Q150 250 200 245 L290 240 Q330 180 400 172 L520 170 Q585 172 630 238 L690 248 Q720 255 725 290 L728 330 Z" fill="${color}" stroke="#0b0d12" stroke-width="3"/>
  <path d="M305 240 Q340 190 400 184 L455 184 L455 240 Z" fill="#9fb3c8" opacity=".85"/>
  <path d="M470 184 L520 184 Q575 188 610 240 L470 240 Z" fill="#9fb3c8" opacity=".85"/>
  <line x1="462" y1="184" x2="462" y2="330" stroke="#0b0d12" stroke-width="2" opacity=".5"/>
  <line x1="300" y1="245" x2="300" y2="330" stroke="#0b0d12" stroke-width="2" opacity=".4"/>
  <rect x="690" y="262" width="30" height="16" rx="4" fill="#ffd27a"/>
  <rect x="112" y="275" width="22" height="14" rx="3" fill="#ff6b6b"/>
  <circle cx="215" cy="335" r="46" fill="#15181f"/><circle cx="215" cy="335" r="22" fill="#6b7280"/>
  <circle cx="610" cy="335" r="46" fill="#15181f"/><circle cx="610" cy="335" r="22" fill="#6b7280"/>
</g>`;
}

function frontCar(color: string, rear: boolean): string {
  const lamp = rear ? "#ff6b6b" : "#ffe7a3";
  return `<g>
  <path d="M220 330 L230 230 Q240 175 300 160 L500 160 Q560 175 570 230 L580 330 Z" fill="${color}" stroke="#0b0d12" stroke-width="3"/>
  <path d="M270 225 Q285 180 320 175 L480 175 Q515 180 530 225 Z" fill="#9fb3c8" opacity=".85"/>
  <rect x="235" y="250" width="80" height="26" rx="6" fill="${lamp}"/>
  <rect x="485" y="250" width="80" height="26" rx="6" fill="${lamp}"/>
  ${rear ? `<rect x="340" y="250" width="120" height="30" rx="4" fill="#d1d5db"/>` : `<rect x="335" y="252" width="130" height="34" rx="6" fill="#111827"/>`}
  <rect x="215" y="300" width="370" height="34" rx="10" fill="#1f2430"/>
  <rect x="230" y="330" width="60" height="30" rx="6" fill="#15181f"/><rect x="510" y="330" width="60" height="30" rx="6" fill="#15181f"/>
</g>`;
}

function interior(): string {
  return `<g>
  <path d="M60 300 Q400 220 740 300 L740 400 L60 400 Z" fill="#2b2f3a"/>
  <circle cx="270" cy="300" r="70" fill="none" stroke="#111827" stroke-width="18"/>
  <circle cx="270" cy="300" r="22" fill="#111827"/>
  <rect x="380" y="250" width="160" height="70" rx="8" fill="#0f172a"/>
  <rect x="560" y="270" width="140" height="40" rx="6" fill="#374151"/>
  <path d="M120 400 L200 330 L330 330 L360 400 Z" fill="#3f3f46"/><path d="M460 400 L490 330 L620 330 L690 400 Z" fill="#3f3f46"/>
</g>`;
}

function engineBay(): string {
  return `<g>
  <rect x="140" y="170" width="520" height="210" rx="16" fill="#2b2f3a" stroke="#0b0d12" stroke-width="3"/>
  <rect x="300" y="200" width="200" height="120" rx="10" fill="#4b5563"/>
  <rect x="180" y="200" width="90" height="60" rx="6" fill="#1f2937"/><rect x="530" y="200" width="100" height="70" rx="6" fill="#111827"/>
  <rect x="160" y="330" width="480" height="30" rx="6" fill="#6b7280"/>
  <circle cx="400" cy="260" r="26" fill="#9ca3af"/>
</g>`;
}

function topCar(color: string): string {
  return `<g><rect x="170" y="140" width="460" height="240" rx="90" fill="${color}" stroke="#0b0d12" stroke-width="3"/>
  <rect x="300" y="170" width="200" height="180" rx="30" fill="#9fb3c8" opacity=".8"/></g>`;
}

function under(): string {
  return `<g><rect x="120" y="150" width="560" height="230" rx="30" fill="#1f2430" stroke="#0b0d12" stroke-width="3"/>
  <rect x="160" y="190" width="480" height="20" fill="#4b5563"/><rect x="160" y="320" width="480" height="20" fill="#4b5563"/>
  <rect x="360" y="200" width="80" height="140" fill="#374151"/></g>`;
}

const REGION_BOX: Record<string, [number, number, number, number]> = {
  left: [110, 180, 260, 170],
  center: [270, 170, 260, 180],
  right: [430, 180, 260, 170],
  top: [200, 140, 400, 110],
  bottom: [150, 280, 500, 110],
  all: [120, 150, 560, 230],
};

function damageMarks(region: string, level: number, seed: number): string {
  const [x, y, w, h] = REGION_BOX[region] ?? REGION_BOX.center!;
  const pts: string[] = [];
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = 0.32 + (((seed * 7 + i * 13) % 10) / 10) * 0.2;
    pts.push(`${(x + w / 2 + Math.cos(a) * w * r).toFixed(0)},${(y + h / 2 + Math.sin(a) * h * r).toFixed(0)}`);
  }
  const opacity = 0.25 + level * 0.15;
  const cracks = Array.from({ length: level * 3 }, (_, i) => {
    const x1 = x + w * (0.25 + ((i * 17 + seed) % 50) / 100);
    const y1 = y + h * (0.3 + ((i * 11 + seed) % 40) / 100);
    return `<path d="M${x1.toFixed(0)} ${y1.toFixed(0)} l${18 + i * 3} ${-14 + i * 5} l${12} ${16} l${15 - i * 2} ${-10}" stroke="#fef08a" stroke-width="2" fill="none" opacity=".9"/>`;
  }).join("");
  return `<polygon points="${pts.join(" ")}" fill="#ef4444" opacity="${opacity.toFixed(2)}" stroke="#fecaca" stroke-dasharray="6 4" stroke-width="2"/>${cracks}`;
}

export function renderDemoPhoto(spec: DemoPhotoSpec, index: number): string {
  const color = spec.color ?? "#cbd5e1";
  let car: string;
  switch (spec.view) {
    case "front":
    case "front_left":
      car = frontCar(color, false);
      break;
    case "rear":
    case "rear_left":
      car = frontCar(color, true);
      break;
    case "left":
      car = sideCar(color, false);
      break;
    case "right":
      car = sideCar(color, true);
      break;
    case "interior":
      car = interior();
      break;
    case "engine_bay":
      car = engineBay();
      break;
    case "roof":
      car = topCar(color);
      break;
    case "undercarriage":
      car = under();
      break;
  }
  const marks = spec.damage.map((d, i) => damageMarks(d.region, d.level, index * 5 + i)).join("");
  const water = spec.water
    ? `<rect x="0" y="300" width="800" height="150" fill="#38bdf8" opacity=".22"/><line x1="0" y1="300" x2="800" y2="300" stroke="#7dd3fc" stroke-width="3" stroke-dasharray="10 6"/>`
    : "";
  const fire = spec.fire ? `<rect x="0" y="0" width="800" height="450" fill="#111" opacity=".35"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450" role="img" aria-label="${esc(spec.caption)}">
<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b4252"/><stop offset=".62" stop-color="#4c566a"/><stop offset=".62" stop-color="#2e3440"/><stop offset="1" stop-color="#262b36"/></linearGradient></defs>
<rect width="800" height="450" fill="url(#g)"/>
${car}${marks}${water}${fire}
<rect x="0" y="404" width="800" height="46" fill="#000" opacity=".55"/>
<text x="20" y="433" font-family="ui-sans-serif,system-ui,sans-serif" font-size="18" fill="#f8fafc">Photo ${index} · ${esc(spec.caption)}</text>
<text x="780" y="433" text-anchor="end" font-family="ui-monospace,monospace" font-size="14" fill="#fbbf24">DEMO PHOTO</text>
</svg>`;
}
