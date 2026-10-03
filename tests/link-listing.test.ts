import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchListing } from "@/lib/providers/listing";
import { NeedsInputError } from "@/lib/providers/types";

vi.mock("@/lib/providers/listing/scrapingApi", () => ({
  fetchListingPage: vi.fn(async () => {
    throw new Error("No scraping provider configured");
  }),
  fetchListingPageDirect: vi.fn(async () => {
    throw new Error("Blocked by the site's bot protection");
  }),
}));

const URL_ = "https://www.copart.com/lot/41258394/salvage-2019-honda-civic-lx-tx-dallas";
const base = { type: "URL" as const, url: URL_, source: "COPART" as const, lotNumber: "41258394", analysisId: "test" };

describe("analyzing a pasted auction link when the page can't be read", () => {
  beforeEach(() => {
    delete process.env.SCRAPINGBEE_API_KEY;
  });

  it("asks for details, prefilled with what the link shows", async () => {
    const err = await fetchListing(base).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(NeedsInputError);
    const e = err as NeedsInputError;
    expect(e.message).toMatch(/Copart blocks automatic reading/);
    expect(e.message).toContain("2019 HONDA CIVIC LX · salvage · Dallas, TX");
    expect(e.prefill).toMatchObject({ year: 2019, make: "HONDA", model: "CIVIC", trim: "LX", titleRaw: "SALVAGE", state: "TX", city: "Dallas" });
  });

  it("builds the listing from the filled-in details plus the link", async () => {
    const res = await fetchListing({
      ...base,
      manual: { year: 2019, make: "HONDA", model: "CIVIC", primaryDamage: "FRONT END", odometer: 48000, currentBid: 1800, listedRetailValue: 16900 },
    });
    expect(res.provider).toBe("Manual entry");
    expect(res.data).toMatchObject({
      source: "COPART",
      lotNumber: "41258394",
      year: 2019,
      make: "HONDA",
      primaryDamage: "FRONT END",
      odometer: 48000,
      currentBid: 1800,
      listedRetailValue: 16900,
      titleCategory: "SALVAGE",
    });
    expect(res.data.location).toMatchObject({ state: "TX", city: "Dallas" });
  });

  it("still asks when only the car is known but not the damage", async () => {
    await expect(fetchListing({ ...base, manual: { year: 2019, make: "HONDA", model: "CIVIC" } })).rejects.toBeInstanceOf(NeedsInputError);
  });
});

describe("yard names to coordinates", async () => {
  const { cityStatePoint, cityCandidates } = await import("@/lib/providers/geo/distance");
  it("understands auction yard naming", () => {
    expect(cityCandidates("Atlanta East")).toContain("Atlanta");
    expect(cityCandidates("Ft Worth")).toContain("Fort Worth");
    expect(cityCandidates("So Sacramento")).toContain("Sacramento");
    for (const [city, state] of [
      ["Atlanta East", "GA"],
      ["Ft Worth", "TX"],
      ["So Sacramento", "CA"],
      ["St Louis", "MO"],
      ["Miami North", "FL"],
    ] as const) {
      expect(cityStatePoint(city, state), `${city}, ${state}`).not.toBeNull();
    }
  });
});
