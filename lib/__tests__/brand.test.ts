import { describe, expect, it } from "vitest";

import { LOGO_ACCENT, LOGO_ASPECT, LOGO_EMBLEM, LOGO_VIEWBOX, LOGO_WORDMARK } from "@/components/brand-art";

import { BRAND_NAME } from "../brand";

describe("brand", () => {
  it("has a name", () => {
    expect(BRAND_NAME).toMatch(/^[A-Z][A-Za-z0-9]+$/);
  });

  it("ships well-formed logo artwork", () => {
    const [x, y, w, h] = LOGO_VIEWBOX.split(" ").map(Number);
    expect([x, y, w, h].every(Number.isFinite)).toBe(true);
    expect(LOGO_ASPECT).toBeCloseTo(w! / h!, 2);
    for (const d of [LOGO_EMBLEM, LOGO_WORDMARK, LOGO_ACCENT]) {
      expect(d).toMatch(/^M[\d.\- C L Z M]+$/); // only move, curve, line and close commands
      const nums = d.match(/-?\d*\.?\d+/g)!.map(Number);
      expect(nums.every(Number.isFinite)).toBe(true);
      expect(nums.length % 2).toBe(0); // x/y pairs
      // every point falls inside the viewBox, give or take the curve handles (which can sit outside the shape)
      for (let i = 0; i < nums.length; i += 2) {
        expect(nums[i]!).toBeGreaterThan(x! - 6);
        expect(nums[i]!).toBeLessThan(x! + w! + 6);
        expect(nums[i + 1]!).toBeGreaterThan(y! - 6);
        expect(nums[i + 1]!).toBeLessThan(y! + h! + 6);
      }
    }
  });
});
