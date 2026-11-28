import { beforeEach, describe, expect, it, vi } from "vitest";

const ai = vi.hoisted(() => ({ research: vi.fn(), structured: vi.fn() }));
vi.mock("@/lib/ai/client", () => ({ generateWebResearch: ai.research, generateStructured: ai.structured }));
const fx = vi.hoisted(() => ({ usdPerUnit: vi.fn() }));
vi.mock("../../fx", async () => ({ usdPerUnit: fx.usdPerUnit, toUsd: (n: number, r: number) => Math.round(n * r) }));

const { valueDestinationMarket } = await import("../destination");

const req = {
  profile: { countryCode: "LT", currency: "EUR", vatBps: 2100 },
  vehicle: "2025 BMW M4 Competition",
  details: "Engine: 3.0L I6",
  mileageMiles: 13_759,
  listToSaleBps: 9600,
  analysisId: "a1",
};

const listing = (price: number, i: number) => ({
  price,
  mileage_km: 20_000 + i * 1000,
  trim: "Competition xDrive",
  location: "Vilnius",
  url: `https://autoplius.lt/skelbimai/${i}`,
});

describe("what the car sells for undamaged in the export destination", () => {
  beforeEach(() => {
    ai.research.mockReset();
    ai.structured.mockReset();
    fx.usdPerUnit.mockReset();
    fx.usdPerUnit.mockResolvedValue({ usdPerUnit: 1.1, live: true });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  it("turns listings found on local sites into dollars, VAT included, after the list-to-sale ratio", async () => {
    ai.research.mockResolvedValue({ text: "notes", searches: 3, sources: [] });
    ai.structured.mockResolvedValue({
      p25: 68_000,
      p50: 72_000,
      p75: 76_000,
      listings: [70_000, 72_000, 73_500, 76_000].map(listing),
      reasoning: "Four dealers.",
    });
    const d = (await valueDestinationMarket(req))!;
    expect(d.grounded).toBe(true);
    expect(d.provider).toBe("AI market research (web)");
    expect(d.confidence).toBe(0.45);
    expect(d.currency).toBe("EUR");
    expect(d.vatBps).toBe(2100);
    // 72,000 EUR x 1.10 = 79,200 USD, x 96%
    expect(d.grossClean.expected).toBe(Math.round(79_200 * 0.96));
    expect(d.grossClean.worst).toBeLessThan(d.grossClean.expected);
    expect(d.grossClean.best).toBeGreaterThan(d.grossClean.expected);
    expect(d.listings).toHaveLength(4);
    expect(d.listings[0]!.priceUsd).toBe(Math.round(70_000 * 1.1));
    expect(d.notes[0]).toBe("AI read 4 current listings in the destination country. Prices include VAT as advertised.");
  });

  it("asks the model for kilometres, the local currency and the local sites", async () => {
    ai.research.mockResolvedValue({ text: "notes", searches: 1, sources: [] });
    ai.structured.mockResolvedValue({ p25: 68_000, p50: 72_000, p75: 76_000, listings: [], reasoning: "x" });
    await valueDestinationMarket(req);
    const args = ai.research.mock.calls[0]![0] as { instructions: string; prompt: string };
    expect(args.prompt).toContain("22,143 km"); // 13,759 mi
    expect(args.prompt).toContain("Lithuania");
    expect(args.instructions).toContain("EUR");
    expect(args.instructions).toContain("autoplius.lt");
    expect(args.instructions).toMatch(/Skip listings that mention accident damage/);
  });

  it("is only an estimate with fewer than three listings, and drops links that are not https", async () => {
    ai.research.mockResolvedValue({ text: "notes", searches: 2, sources: [] });
    ai.structured.mockResolvedValue({
      p25: 68_000,
      p50: 72_000,
      p75: 76_000,
      listings: [{ ...listing(72_000, 1), url: "javascript:alert(1)" }],
      reasoning: "One listing.",
    });
    const d = (await valueDestinationMarket(req))!;
    expect(d.grounded).toBe(false);
    expect(d.provider).toBe("AI estimate — verify");
    expect(d.confidence).toBe(0.25);
    expect(d.listings[0]!.url).toBeNull();
    expect(d.notes[0]).toMatch(/Fewer than three comparable listings/);
  });

  it("falls back to the model's own knowledge when web search fails", async () => {
    ai.research.mockRejectedValue(new Error("web search is not enabled"));
    ai.structured.mockResolvedValue({ p25: 68_000, p50: 72_000, p75: 76_000, listings: [], reasoning: "From training data." });
    const d = (await valueDestinationMarket(req))!;
    expect(d.grounded).toBe(false);
    expect(d.listings).toEqual([]);
    expect(ai.structured).toHaveBeenCalledTimes(1);
  });

  it("says so when the exchange rate is the fixed fallback", async () => {
    fx.usdPerUnit.mockResolvedValue({ usdPerUnit: 1.1, live: false });
    ai.research.mockResolvedValue({ text: "notes", searches: 1, sources: [] });
    ai.structured.mockResolvedValue({ p25: 68_000, p50: 72_000, p75: 76_000, listings: [1, 2, 3].map((i) => listing(70_000 + i * 1000, i)), reasoning: "ok" });
    const d = (await valueDestinationMarket(req))!;
    expect(d.fxLive).toBe(false);
    expect(d.notes).toContain("The exchange rate is approximate: the live rate was unavailable.");
  });

  it("returns nothing, so the report asks for the price, when the answer is implausible or the AI is down", async () => {
    ai.research.mockResolvedValue({ text: "notes", searches: 1, sources: [] });
    ai.structured.mockResolvedValue({ p25: 10, p50: 20, p75: 30, listings: [], reasoning: "nonsense" });
    expect(await valueDestinationMarket(req)).toBeNull();

    ai.research.mockRejectedValue(new Error("down"));
    ai.structured.mockRejectedValue(new Error("down"));
    expect(await valueDestinationMarket(req)).toBeNull();
  });

  it("converts a country priced in zloty with the zloty rate", async () => {
    fx.usdPerUnit.mockResolvedValue({ usdPerUnit: 0.26, live: true });
    ai.research.mockResolvedValue({ text: "notes", searches: 1, sources: [] });
    ai.structured.mockResolvedValue({
      p25: 280_000,
      p50: 300_000,
      p75: 320_000,
      listings: [1, 2, 3].map((i) => listing(290_000 + i * 5000, i)),
      reasoning: "ok",
    });
    const d = (await valueDestinationMarket({ ...req, profile: { countryCode: "PL", currency: "PLN", vatBps: 2300 } }))!;
    expect(fx.usdPerUnit).toHaveBeenCalledWith("PLN");
    expect(d.grossClean.expected).toBe(Math.round(Math.round(300_000 * 0.26) * 0.96));
  });
});
