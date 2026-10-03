import { describe, expect, it } from "vitest";

import { normalizeTitle } from "@/lib/domain/titles";

import { describeHints, hintsFromAuctionUrl, hintsIdentifyVehicle } from "../urlHints";

describe("hintsFromAuctionUrl", () => {
  it("reads a Copart lot slug", () => {
    const h = hintsFromAuctionUrl("https://www.copart.com/lot/43562513/salvage-2019-audi-a3-premium-tx-dallas");
    expect(h).toMatchObject({ year: 2019, make: "AUDI", model: "A3", trim: "PREMIUM", titleRaw: "SALVAGE", state: "TX", city: "Dallas" });
    expect(hintsIdentifyVehicle(h)).toBe(true);
    expect(describeHints(h)).toBe("2019 AUDI A3 PREMIUM · salvage · Dallas, TX");
  });

  it("handles multi-word titles, makes, hyphenated models and city names", () => {
    expect(hintsFromAuctionUrl("https://www.copart.com/lot/56789012/certificate-of-destruction-2015-ford-f-150-xl-fl-miami-north")).toMatchObject({
      year: 2015,
      make: "FORD",
      model: "F-150",
      trim: "XL",
      titleRaw: "CERTIFICATE OF DESTRUCTION",
      state: "FL",
      city: "Miami North",
    });
    expect(hintsFromAuctionUrl("https://www.copart.com/lot/41258394/clean-title-2020-land-rover-range-rover-ca-los-angeles")).toMatchObject({
      make: "LAND ROVER",
      model: "RANGE",
      state: "CA",
      city: "Los Angeles",
      titleRaw: "CLEAN TITLE",
    });
    expect(hintsFromAuctionUrl("https://www.copart.com/lot/41258395/salvage-2021-honda-cr-v-ex-tx-houston")).toMatchObject({ model: "CR-V", trim: "EX" });
    expect(hintsFromAuctionUrl("https://www.copart.com/lot/41258396/salvage-2018-mercedes-benz-c-300-ga-atlanta")).toMatchObject({
      make: "MERCEDES-BENZ",
      model: "C-300",
      state: "GA",
    });
  });

  it("titles from slugs normalize to the right category", () => {
    expect(normalizeTitle("SALVAGE")).toBe("SALVAGE");
    expect(normalizeTitle("CLEAN TITLE")).toBe("CLEAN");
    expect(normalizeTitle("CERTIFICATE OF DESTRUCTION")).toBe("NON_REPAIRABLE");
  });

  it("reads the VIN and vehicle from a Bid.cars slug", () => {
    const h = hintsFromAuctionUrl("https://bid.cars/en/lot/1-43562513/2019-Audi-A3-WAUAUGFF3K1012345");
    expect(h).toMatchObject({ year: 2019, make: "AUDI", model: "A3", vin: "WAUAUGFF3K1012345", state: null });
    expect(hintsIdentifyVehicle(h)).toBe(true);
  });

  it("returns nothing it can't read", () => {
    const iaai = hintsFromAuctionUrl("https://www.iaai.com/VehicleDetail/41234567~US");
    expect(hintsIdentifyVehicle(iaai)).toBe(false);
    expect(hintsFromAuctionUrl("https://www.copart.com/lot/43562513")).toMatchObject({ year: null, make: null });
    expect(hintsFromAuctionUrl("not a url").make).toBeNull();
  });
});
