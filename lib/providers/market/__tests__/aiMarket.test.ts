import { beforeEach, describe, expect, it, vi } from "vitest";

import { vehicleDetails } from "../details";

const ai = vi.hoisted(() => ({
  research: vi.fn(),
  structured: vi.fn(),
}));
vi.mock("@/lib/ai/client", () => ({ generateWebResearch: ai.research, generateStructured: ai.structured }));
vi.mock("@/lib/config/env", () => ({
  env: () => ({ VINAUDIT_MARKET_URL: "", VINAUDIT_API_KEY: undefined }),
  features: { marketcheck: () => false, vinauditMarket: () => false, ai: () => true },
}));

const { valueMarket } = await import("../index");

const req = {
  vin: null,
  year: 2025,
  make: "BMW",
  model: "M4",
  trim: "Competition",
  mileage: 4200,
  zip: "60601",
  listToSaleBps: 9600,
  listedRetailValue: null,
  details: "Engine: 3.0L I6",
  analysisId: "a1",
};

const listing = (price: number, i: number) => ({
  price,
  mileage: 3000 + i * 1000,
  trim: "Competition",
  location: "Naperville, IL",
  url: `https://www.cars.com/vehicledetail/${i}/`,
});

describe("AI market valuation", () => {
  beforeEach(() => {
    ai.research.mockReset();
    ai.structured.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("is grounded when the web research yields at least three listings, and keeps them as comps", async () => {
    ai.research.mockResolvedValue({ text: "notes", searches: 3, sources: [] });
    ai.structured.mockResolvedValue({
      p25: 76000,
      p50: 80000,
      p75: 84000,
      listings: [76000, 79000, 80500, 84000].map(listing),
      reasoning: "Four 2025 M4s near 4k miles.",
    });
    const m = await valueMarket(req);
    expect(m.provider).toBe("AI market research (web)");
    expect(m.confidence).toBeGreaterThan(0.25);
    expect(m.compsCount).toBe(4);
    expect(m.comps[0]).toMatchObject({ price: 76000, city: "Naperville", state: "IL", sellerType: "dealer" });
    expect(m.mvClean.expected).toBe(Math.round((80000 * 9600) / 10000));
    expect(m.notes.join(" ")).toContain("AI read 4 current listings");
  });

  it("is only an estimate when the search finds fewer than three listings", async () => {
    ai.research.mockResolvedValue({ text: "notes", searches: 2, sources: [] });
    ai.structured.mockResolvedValue({ p25: 76000, p50: 80000, p75: 84000, listings: [listing(80000, 1)], reasoning: "One listing." });
    const m = await valueMarket(req);
    expect(m.provider).toBe("AI estimate — verify");
    expect(m.confidence).toBe(0.25);
  });

  it("falls back to the model's own knowledge when web search isn't available", async () => {
    ai.research.mockRejectedValue(new Error("web search is not enabled"));
    ai.structured.mockResolvedValue({ p25: 70000, p50: 75000, p75: 80000, listings: [], reasoning: "From training data." });
    const m = await valueMarket(req);
    expect(m.provider).toBe("AI estimate — verify");
    expect(m.comps).toEqual([]);
    expect(ai.structured).toHaveBeenCalledTimes(1);
  });

  it("drops non-https links and rejects an implausible answer", async () => {
    ai.research.mockResolvedValue({ text: "notes", searches: 1, sources: [] });
    ai.structured.mockResolvedValueOnce({
      p25: 76000,
      p50: 80000,
      p75: 84000,
      listings: [76000, 80000, 84000].map((p, i) => ({ ...listing(p, i), url: "javascript:alert(1)" })),
      reasoning: "x",
    });
    const m = await valueMarket(req);
    expect(m.comps.every((c) => c.url === null)).toBe(true);

    ai.research.mockResolvedValue({ text: "notes", searches: 1, sources: [] });
    ai.structured.mockResolvedValue({ p25: 10, p50: 20, p75: 30, listings: [], reasoning: "nonsense" });
    const none = await valueMarket(req);
    expect(none.provider).toBe("NONE");
  });
});

describe("vehicleDetails", () => {
  it("lists the facts that move a price and leaves the title brand out", () => {
    const text = vehicleDetails(
      {
        vin: "WBS43AZ00R0000001",
        engine: null,
        transmission: null,
        drive: null,
        fuel: null,
        color: "RED",
        odometer: 4200,
        odometerUnit: "mi",
        odometerBrand: "ACTUAL",
        location: { yardName: null, city: "Chicago", state: "IL", zip: null },
      },
      { bodyClass: "Coupe", driveType: "RWD", engine: "3.0L I6", fuelType: "Gasoline", transmission: "Automatic", turbo: true },
    );
    expect(text).toContain("Body: Coupe");
    expect(text).toContain("Engine: 3.0L I6");
    expect(text).toContain("Turbocharged: yes");
    expect(text).toContain("Odometer: 4,200 mi");
    expect(text).toContain("Car is located in: Chicago, IL");
    expect(text.toLowerCase()).not.toContain("salvage");
  });
});
