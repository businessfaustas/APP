import { describe, expect, it } from "vitest";

import { usableOdometer } from "../odometer";

describe("the odometer read from the photos", () => {
  it("accepts a believable reading", () => {
    expect(usableOdometer(55403)).toBe(55403);
    expect(usableOdometer(100)).toBe(100);
  });
  it("ignores a missing, zero, negative or absurd one, which would move the market value by thousands", () => {
    for (const v of [null, undefined, 0, 12, -5, 9_999_999, Number.NaN, Number.POSITIVE_INFINITY]) expect(usableOdometer(v)).toBeNull();
  });
});
