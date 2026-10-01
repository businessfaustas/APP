import { describe, expect, it } from "vitest";

import type { Comp } from "@/lib/domain/schemas";

import { adjustComps, compsConfidence, DEFAULT_SLOPE, median, mileageSlope, olsSlope, percentile, scenarioValues } from "../stats";

const comp = (price: number, mileage: number | null): Comp => ({
  price,
  adjustedPrice: price,
  mileage,
  year: null,
  trim: null,
  distanceMiles: null,
  sellerType: "dealer",
  daysOnMarket: null,
  url: null,
  city: null,
  state: null,
});

describe("market stats", () => {
  it("percentiles", () => {
    expect(percentile([1, 2, 3, 4, 5], 50)).toBe(3);
    expect(percentile([10, 20], 25)).toBe(12.5);
    expect(percentile([], 50)).toBe(0);
    expect(median([5, 1, 3])).toBe(3);
  });

  it("OLS slope", () => {
    expect(olsSlope([0, 1, 2], [10, 8, 6])).toBe(-2);
    expect(olsSlope([1, 1], [1, 2])).toBeNull();
    expect(olsSlope([1], [1])).toBeNull();
  });

  it("uses the default slope below 8 comps and clamps the regression", () => {
    expect(mileageSlope([comp(20000, 10000), comp(19000, 20000)])).toBe(DEFAULT_SLOPE);
    const steep = Array.from({ length: 10 }, (_, i) => comp(30000 - i * 5000, i * 10000)); // −0.5 $/mi
    expect(mileageSlope(steep)).toBe(-0.25);
    const rising = Array.from({ length: 10 }, (_, i) => comp(20000 + i * 1000, i * 10000)); // +0.1 $/mi
    expect(mileageSlope(rising)).toBe(0);
  });

  it("adjusts comps to the subject mileage and computes scenario values", () => {
    const adjusted = adjustComps([comp(20000, 50000), comp(18000, 70000), comp(19000, null)], 60000, -0.1);
    expect(adjusted.map((c) => c.adjustedPrice)).toEqual([19000, 19000, 19000]);
    expect(scenarioValues(adjusted, 9600)).toEqual({ worst: 18240, expected: 18240, best: 18240 });
    expect(adjustComps([comp(20000, 50000)], null, -0.1)[0]!.adjustedPrice).toBe(20000);
  });

  it("confidence grows with more, tighter comps", () => {
    const few = adjustComps([comp(20000, 1), comp(15000, 1)], null, 0);
    const many = adjustComps(
      Array.from({ length: 12 }, (_, i) => comp(20000 + i * 50, 1)),
      null,
      0,
    );
    expect(compsConfidence(many)).toBeGreaterThan(compsConfidence(few));
    expect(compsConfidence([])).toBe(0);
  });
});
