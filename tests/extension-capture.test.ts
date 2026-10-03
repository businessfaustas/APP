import { describe, expect, it } from "vitest";

import { fetchListing } from "@/lib/providers/listing";

// What Chrome's innerText looks like on a Copart lot page: menus and search first, the vehicle
// further down, the VIN masked for visitors, a footer and "similar vehicles" at the end.
const NAV = Array.from(
  { length: 70 },
  (_, i) =>
    [
      "Skip to main content",
      "How it works",
      "Find vehicles",
      "Auctions",
      "Locations",
      "Sell my car",
      "Sign in",
      "Register",
      "Search by make, model, VIN or lot #",
      "Español",
    ][i % 10],
);
const PAGE = [
  ...NAV,
  "2019 AUDI A3 PREMIUM",
  "Lot #43562513",
  "Sale information",
  "Lot Number:",
  "43562513",
  "VIN:",
  "WAUAUGFF3K1******",
  "Title Code:",
  "TX - SALVAGE CERTIFICATE",
  "Odometer:",
  "61,200 mi (ACTUAL)",
  "Primary Damage:",
  "FRONT END",
  "Secondary Damage:",
  "MINOR DENT/SCRATCHES",
  "Estimated Retail Value:",
  "$21,450 USD",
  "Highlights:",
  "Run and Drive",
  "Keys:",
  "YES",
  "Sale Location:",
  "TX - DALLAS",
  "Current Bid:",
  "$2,100 USD",
  "Similar vehicles",
  "2018 AUDI A4 PREMIUM",
  "© 2026 Copart Inc. All Rights Reserved",
].join("\n");

const capture = (url: string, pageText: string) => ({ url, pageText, html: null, jsonLd: [], imageUrls: [] });

describe("browser extension capture of a real-looking Copart page", () => {
  it("finds the vehicle below the site menus even with a masked VIN", async () => {
    const url = "https://www.copart.com/lot/43562513";
    const res = await fetchListing({ type: "EXTENSION", url, source: "COPART", lotNumber: "43562513", extension: capture(url, PAGE), analysisId: "t" });
    expect(res.provider).toBe("Browser extension");
    expect(res.data).toMatchObject({
      year: 2019,
      make: "AUDI",
      model: "A3",
      lotNumber: "43562513",
      odometer: 61200,
      primaryDamage: "FRONT END",
      listedRetailValue: 21450,
      currentBid: 2100,
      titleCategory: "SALVAGE",
    });
    expect(res.data.location.state).toBe("TX");
  });

  it("falls back to the link's details when the page text has no heading", async () => {
    const url = "https://www.copart.com/lot/43562513/salvage-2019-audi-a3-premium-tx-dallas";
    const text = PAGE.replace("2019 AUDI A3 PREMIUM\n", "");
    const res = await fetchListing({ type: "EXTENSION", url, source: "COPART", lotNumber: "43562513", extension: capture(url, text), analysisId: "t" });
    expect(res.data).toMatchObject({ year: 2019, make: "AUDI", model: "A3", primaryDamage: "FRONT END" });
  });

  it("ignores footers and non-makes when looking for the vehicle", async () => {
    const url = "https://www.copart.com/lot/43562513";
    const text = [...NAV, "© 2026 Copart Inc. All Rights Reserved", "2025 Season Schedule"].join("\n");
    await expect(
      fetchListing({ type: "EXTENSION", url, source: "COPART", lotNumber: "43562513", extension: capture(url, text), analysisId: "t" }),
    ).rejects.toThrow(/couldn't find the year, make and model/);
  });
});
