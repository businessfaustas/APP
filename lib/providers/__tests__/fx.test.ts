import { beforeEach, describe, expect, it, vi } from "vitest";

const http = vi.hoisted(() => ({ fetchWithTimeout: vi.fn() }));
vi.mock("../http", () => http);
vi.mock("@/lib/pipeline/cache", () => ({ cached: (_k: string, _ttl: number, fn: () => Promise<unknown>) => fn(), TTL: { hours: (h: number) => h } }));

const { usdPerUnit, toUsd, FALLBACK_USD_PER, isFxCurrency } = await import("../fx");

const answer = (rates: Record<string, number>) => ({ ok: true, json: async () => ({ rates }) });

describe("exchange rates", () => {
  beforeEach(() => {
    http.fetchWithTimeout.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("turns the ECB's per-dollar rates into dollars per euro and per zloty", async () => {
    http.fetchWithTimeout.mockResolvedValue(answer({ EUR: 0.8, PLN: 4 }));
    expect(await usdPerUnit("EUR")).toEqual({ usdPerUnit: 1.25, live: true });
    expect(await usdPerUnit("PLN")).toEqual({ usdPerUnit: 0.25, live: true });
  });

  it("needs no lookup for dollars", async () => {
    expect(await usdPerUnit("USD")).toEqual({ usdPerUnit: 1, live: true });
    expect(http.fetchWithTimeout).not.toHaveBeenCalled();
  });

  it("falls back to a fixed rate, marked as not live, when the service is down or answers nonsense", async () => {
    http.fetchWithTimeout.mockRejectedValue(new Error("offline"));
    expect(await usdPerUnit("EUR")).toEqual({ usdPerUnit: FALLBACK_USD_PER.EUR, live: false });
    http.fetchWithTimeout.mockResolvedValue({ ok: false, status: 500 });
    expect((await usdPerUnit("PLN")).live).toBe(false);
    http.fetchWithTimeout.mockResolvedValue(answer({ EUR: 0, PLN: 4 }));
    expect((await usdPerUnit("EUR")).live).toBe(false);
  });

  it("treats a currency it doesn't know as dollars, not live", async () => {
    expect(await usdPerUnit("XYZ")).toEqual({ usdPerUnit: 1, live: false });
    expect(isFxCurrency("EUR")).toBe(true);
    expect(isFxCurrency("GBP")).toBe(false);
  });

  it("rounds to whole dollars", () => {
    expect(toUsd(72_000, 1.1)).toBe(79_200);
    expect(toUsd(100, 0.255)).toBe(26);
  });
});
