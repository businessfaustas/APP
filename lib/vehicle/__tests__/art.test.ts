import { describe, expect, it } from "vitest";

import { renderDemoPhoto } from "@/lib/demo/photoSvg";

import { carArtMarkup, damageSpot, paintOf } from "../art";

describe("paintOf", () => {
  it("maps listing colour names (English and Lithuanian) to a paint hex", () => {
    expect(paintOf("White")).toBe("#e8ebf0");
    expect(paintOf("Dark Blue")).toBe("#2c5fbd");
    expect(paintOf("raudona")).toBe("#b5262e");
    expect(paintOf("#123abc")).toBe("#123abc");
  });

  it("falls back to silver when the colour is unknown or missing", () => {
    expect(paintOf(null)).toBe("#aab1bd");
    expect(paintOf("Unobtainium")).toBe("#aab1bd");
  });
});

describe("carArtMarkup", () => {
  it("is deterministic and scopes every id to the given prefix", () => {
    const a = carArtMarkup({ id: "x1", body: "suv", paint: "#2c5fbd" });
    expect(carArtMarkup({ id: "x1", body: "suv", paint: "#2c5fbd" })).toBe(a);
    for (const m of a.matchAll(/\sid="([^"]+)"/g)) expect(m[1]).toMatch(/^x1-/);
    for (const m of a.matchAll(/url\(#([^)]+)\)/g)) expect(m[1]).toMatch(/^x1-/);
  });

  it("marks only the damaged zones, and adds the scan beam on request", () => {
    const clean = carArtMarkup({ id: "c", zones: [{ zone: "front", severity: 0 }] });
    expect(clean).not.toContain('class="ping"');
    expect(clean).not.toContain('class="scan"');
    const hit = carArtMarkup({
      id: "c",
      body: "pickup",
      scanning: true,
      zones: [
        { zone: "front", severity: 6 },
        { zone: "roof", severity: 3 },
      ],
    });
    expect(hit.match(/class="ping"/g)).toHaveLength(2);
    expect(hit).toContain('class="scan"');
  });
});

describe("renderDemoPhoto", () => {
  it("draws every view as a well-formed SVG and escapes the caption", () => {
    const views = ["front", "rear", "left", "right", "front_left", "rear_left", "interior", "engine_bay", "roof", "undercarriage"] as const;
    for (const view of views) {
      const svg = renderDemoPhoto({ view, damage: [{ region: "center", level: 2 }], caption: 'A "quoted" <caption>' }, 1, { body: "sedan" });
      expect(svg.startsWith("<svg")).toBe(true);
      expect(svg.trimEnd().endsWith("</svg>")).toBe(true);
      expect(svg).toContain("A &quot;quoted&quot; &lt;caption&gt;");
      expect(svg).toContain("DAMAGE 2/3");
      expect(svg).not.toContain("undefined");
      expect(svg).not.toContain("NaN");
    }
  });
});

describe("damageSpot", () => {
  it("places zones on the car's own box: front on the right, rear on the left, roof on top", () => {
    const front = damageSpot("sedan", "front");
    const rear = damageSpot("sedan", "rear");
    const roof = damageSpot("sedan", "roof");
    expect(front.x).toBeGreaterThan(0.9);
    expect(rear.x).toBeLessThan(0.1);
    expect(roof.y).toBeLessThan(0.1);
    expect(damageSpot("sedan", "undercarriage").y).toBeGreaterThan(0.85);
  });
  it("stays inside the box for every body and zone, and a coupe uses the sedan's spots", () => {
    for (const body of ["sedan", "suv", "pickup", "coupe"] as const) {
      for (const zone of ["front", "front_left", "rear", "left_side", "roof", "undercarriage", "interior"] as const) {
        const s = damageSpot(body, zone);
        expect(s.x).toBeGreaterThanOrEqual(0);
        expect(s.x).toBeLessThanOrEqual(1);
        expect(s.y).toBeGreaterThanOrEqual(0);
        expect(s.y).toBeLessThanOrEqual(1);
        expect(s.w).toBeGreaterThan(0);
      }
    }
    expect(damageSpot("coupe", "front")).toEqual(damageSpot("sedan", "front"));
  });
});
