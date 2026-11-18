import { afterEach, describe, expect, it, vi } from "vitest";

import { fitsVehicle, MIN_LISTINGS, robustRange, searchQuery, summarizeListings, type PartListing } from "../aggregate";
import { marketPartPrices, type PartsMarketDeps } from "../index";

const m4 = { year: 2019, make: "BMW", model: "M4 COMPETITION" };
const NOW = "2026-11-18T10:00:00.000Z";

const listing = (title: string, price: number, condition: "NEW" | "USED" = "NEW", url = `https://www.ebay.com/itm/${title}-${price}`): PartListing => ({
  title,
  price,
  url,
  condition,
});

describe("search query", () => {
  it("names the car and the part, with the side spelled out", () => {
    expect(searchQuery(m4, "Headlamp assembly LH")).toBe("BMW M4 COMPETITION Headlamp assembly left");
    expect(searchQuery({ year: null, make: null, model: null }, "Hood")).toBe("Hood");
  });
});

describe("fitsVehicle", () => {
  it("needs the same make and model", () => {
    expect(fitsVehicle("2015-2020 BMW M4 Front Bumper Cover", m4)).toBe(true);
    expect(fitsVehicle("2015-2020 Audi A3 Front Bumper Cover", m4)).toBe(false);
    expect(fitsVehicle("2015-2020 BMW X5 Front Bumper Cover", m4)).toBe(false);
  });
  it("rejects titles whose model years exclude the car", () => {
    expect(fitsVehicle("BMW M4 bumper 2014-2017", m4)).toBe(false);
    expect(fitsVehicle("BMW M4 bumper 2018 2019 2020", m4)).toBe(true);
    expect(fitsVehicle("BMW M4 bumper cover", m4)).toBe(true); // no year in the title: not excluded
  });
  it("copes with models written differently", () => {
    expect(fitsVehicle("Ford F-150 tailgate 2015-2020", { year: 2018, make: "FORD", model: "F150" })).toBe(true);
    expect(fitsVehicle("BMW 3 Series headlight", { year: 2016, make: "BMW", model: "3 SERIES" })).toBe(true);
    expect(fitsVehicle("Mercedes-Benz C300 hood", { year: 2016, make: "MERCEDES-BENZ", model: "C300" })).toBe(true);
  });
  it("drops toys, stickers and wrecked parts", () => {
    expect(fitsVehicle("BMW M4 1:18 diecast model", m4)).toBe(false);
    expect(fitsVehicle("BMW M4 bumper cover cracked for parts", m4)).toBe(false);
  });
});

describe("robustRange", () => {
  it("needs enough listings", () => {
    expect(robustRange([100, 120])).toBeNull();
    expect(robustRange([100, 120, 140])).not.toBeNull();
    expect(MIN_LISTINGS).toBe(3);
  });
  it("ignores wild outliers and returns the middle of the market", () => {
    const r = robustRange([8, 180, 190, 200, 210, 220, 230, 4000])!;
    expect(r.kept).toEqual([180, 190, 200, 210, 220, 230]);
    expect(r.low).toBeGreaterThanOrEqual(190);
    expect(r.high).toBeLessThanOrEqual(220);
    expect(r.low).toBeLessThanOrEqual(r.mid);
    expect(r.mid).toBeLessThanOrEqual(r.high);
  });
});

describe("summarizeListings", () => {
  const listings: PartListing[] = [
    listing("BMW M4 front bumper cover 2015-2020 OEM genuine", 640),
    listing("BMW M4 front bumper cover genuine factory 2018-2020", 700),
    listing("BMW M4 front bumper cover original 2015-2020", 760),
    listing("BMW M4 front bumper cover aftermarket 2015-2020", 210),
    listing("BMW M4 front bumper cover replacement 2015-2020", 250),
    listing("BMW M4 front bumper cover primed 2015-2020", 280),
    listing("BMW M4 front bumper cover 2015-2020", 120, "USED"),
    listing("BMW M4 front bumper cover 2018-2020 used", 150, "USED"),
    listing("BMW M4 front bumper cover 2015-2020 take off", 180, "USED"),
    listing("Audi A3 front bumper cover", 90, "USED"), // wrong car
  ];

  it("separates OEM new, aftermarket and used, with proof for each", () => {
    const s = summarizeListings(listings, m4, NOW);
    expect(s.OEM_NEW).toMatchObject({ low: expect.any(Number), high: expect.any(Number) });
    expect(s.OEM_NEW!.mid).toBeGreaterThan(600);
    expect(s.AFTERMARKET!.mid).toBeLessThan(300);
    expect(s.USED!.mid).toBeLessThan(200);
    expect(s.evidence.map((e) => e.source).sort()).toEqual(["AFTERMARKET", "OEM_NEW", "USED"]);
    const used = s.evidence.find((e) => e.source === "USED")!;
    expect(used.count).toBe(3); // the Audi listing is not counted
    expect(used.sample.length).toBeLessThanOrEqual(3);
    expect(used.retrievedAt).toBe(NOW);
  });

  it("leaves a column empty when there are fewer than three matching listings", () => {
    const s = summarizeListings(listings.slice(0, 5), m4, NOW);
    expect(s.OEM_NEW).not.toBeNull();
    expect(s.AFTERMARKET).toBeNull(); // only two aftermarket listings
    expect(s.USED).toBeNull();
  });

  it("counts a duplicate listing once", () => {
    const dup = [
      listing("BMW M4 hood", 500, "USED", "https://x/1"),
      listing("BMW M4 hood", 500, "USED", "https://x/1"),
      listing("BMW M4 hood", 520, "USED", "https://x/2"),
    ];
    expect(summarizeListings(dup, m4, NOW).USED).toBeNull();
  });
});

describe("marketPartPrices", () => {
  const search = vi.fn(async (_q: string, condition: "NEW" | "USED") =>
    [210, 230, 250, 270].map((p, i) => listing(`BMW M4 hood ${condition} ${i}`, condition === "USED" ? p / 2 : p, condition, `https://ebay/${condition}/${i}`)),
  );
  const store = new Map<string, unknown>();
  const deps: PartsMarketDeps = {
    search,
    cache: async <T>(key: string, _ttl: number, fn: () => Promise<T>) => {
      if (store.has(key)) return store.get(key) as T;
      const v = await fn();
      store.set(key, v);
      return v;
    },
    now: () => new Date(NOW),
  };
  afterEach(() => {
    search.mockClear();
    store.clear();
  });

  it("prices each part from new and used listings and caches the listings", async () => {
    const out = await marketPartPrices({ vehicle: m4, parts: [{ index: 0, name: "Hood panel" }] }, deps);
    expect(out).toHaveLength(1);
    expect(out[0]!.AFTERMARKET!.mid).toBeGreaterThan(200);
    expect(out[0]!.USED!.mid).toBeLessThan(150);
    expect(search).toHaveBeenCalledTimes(2); // one new, one used
    await marketPartPrices({ vehicle: m4, parts: [{ index: 0, name: "Hood panel" }] }, deps);
    expect(search).toHaveBeenCalledTimes(2); // served from the cache
  });

  it("skips a part whose lookup fails without failing the others", async () => {
    const flaky: PartsMarketDeps = {
      ...deps,
      search: async (q, c) => {
        if (q.includes("Fender")) throw new Error("HTTP 500");
        return search(q, c);
      },
    };
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const out = await marketPartPrices(
      {
        vehicle: m4,
        parts: [
          { index: 0, name: "Fender LH" },
          { index: 1, name: "Hood panel" },
        ],
      },
      flaky,
    );
    spy.mockRestore();
    expect(out.map((o) => o.index)).toEqual([1]);
  });
});
