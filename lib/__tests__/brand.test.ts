import { describe, expect, it } from "vitest";

import { BRAND_NAME, brandParts } from "../brand";

describe("brandParts", () => {
  it("splits a CamelCase name where the second word starts", () => {
    expect(brandParts("BidPilot")).toEqual(["Bid", "Pilot"]);
    expect(brandParts("BidLens")).toEqual(["Bid", "Lens"]);
  });

  it("returns a single word whole, with no accent part", () => {
    expect(brandParts("Taikora")).toEqual(["Taikora", ""]);
  });

  it("defaults to the product name", () => {
    expect(brandParts().join("")).toBe(BRAND_NAME);
  });
});
