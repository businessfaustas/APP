import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/config/env", () => ({
  env: () => ({ EBAY_CLIENT_ID: "id", EBAY_CLIENT_SECRET: "secret", EBAY_MARKETPLACE: "EBAY_US" }),
}));

const { searchEbayParts, checkEbay } = await import("../ebay");

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("eBay client", () => {
  const fetchMock = vi.fn();
  beforeEach(() => vi.stubGlobal("fetch", fetchMock));
  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it("signs in with the keyset, then searches fixed-price listings in the right condition", async () => {
    fetchMock.mockResolvedValueOnce(json({ access_token: "tok", expires_in: 7200 })).mockResolvedValueOnce(
      json({
        itemSummaries: [
          { title: "BMW M4 hood", itemWebUrl: "https://www.ebay.com/itm/1", price: { value: "312.50", currency: "USD" } },
          { title: "No price", itemWebUrl: "https://www.ebay.com/itm/2" },
          { title: "Euro listing", itemWebUrl: "https://www.ebay.com/itm/3", price: { value: "99.00", currency: "EUR" } },
        ],
      }),
    );
    const out = await searchEbayParts("BMW M4 hood", "USED");
    expect(out).toEqual([{ title: "BMW M4 hood", price: 313, url: "https://www.ebay.com/itm/1", condition: "USED" }]);

    const [tokenUrl, tokenInit] = fetchMock.mock.calls[0]!;
    expect(String(tokenUrl)).toBe("https://api.ebay.com/identity/v1/oauth2/token");
    expect((tokenInit.headers as Record<string, string>).authorization).toBe(`Basic ${Buffer.from("id:secret").toString("base64")}`);

    const [searchUrl, searchInit] = fetchMock.mock.calls[1]!;
    const url = new URL(String(searchUrl));
    expect(url.pathname).toBe("/buy/browse/v1/item_summary/search");
    expect(url.searchParams.get("q")).toBe("BMW M4 hood");
    expect(url.searchParams.get("filter")).toContain("conditionIds:{3000}");
    expect(url.searchParams.get("filter")).toContain("buyingOptions:{FIXED_PRICE}");
    expect((searchInit.headers as Record<string, string>)["x-ebay-c-marketplace-id"]).toBe("EBAY_US");
  });

  it("reuses the token, and signs in again after a 401", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ itemSummaries: [] }, 401))
      .mockResolvedValueOnce(json({ access_token: "fresh", expires_in: 7200 }))
      .mockResolvedValueOnce(json({ itemSummaries: [] }));
    await expect(searchEbayParts("x", "NEW")).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("reports a rejected keyset", async () => {
    fetchMock.mockResolvedValueOnce(json({ error: "invalid_client" }, 401));
    await expect(checkEbay()).rejects.toThrow(/HTTP 401/);
  });
});
