import { describe, expect, it, vi } from "vitest";

import { formatEur } from "@/lib/utils";

import { isPackId, PACK_ORDER, PACKS, PLANS, pricePerReport } from "../plans";

const envMock = vi.hoisted(() => ({ values: {} as Record<string, string | undefined> }));
vi.mock("@/lib/config/env", () => ({ env: () => envMock.values }));
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));

const { creditsForSession, priceFor } = await import("../stripe");

describe("packs", () => {
  it("get cheaper per car as they get bigger", () => {
    const perCar = PACK_ORDER.map((id) => pricePerReport(PACKS[id]));
    expect(perCar).toEqual([2.9, 2.5, 1.99]);
    expect([...perCar].sort((a, b) => b - a)).toEqual(perCar);
  });

  it("stay dearer per car than any monthly plan's included reports", () => {
    const cheapestPack = pricePerReport(PACKS.PACK_100);
    for (const id of ["PRO", "BUSINESS"] as const) expect(PLANS[id].priceMonthly / PLANS[id].monthlyCredits).toBeLessThan(cheapestPack);
  });

  it("formats in euros, with decimals only when needed", () => {
    expect(formatEur(29)).toBe("€29");
    expect(formatEur(2.9)).toBe("€2.90");
    expect(formatEur(29, "lt-LT").replace(/\s/g, " ")).toBe("29 €");
  });

  it("only recognises known pack ids", () => {
    expect(isPackId("PACK_30")).toBe(true);
    expect(isPackId("PACK_31")).toBe(false);
    expect(isPackId("PRO")).toBe(false);
  });
});

describe("credits for a paid checkout", () => {
  it("takes the size from our own table, not from the session", () => {
    expect(creditsForSession({ kind: "PACK", pack: "PACK_30", credits: "9999" })).toBe(30);
    expect(creditsForSession({ kind: "PACK", pack: "PACK_100" })).toBe(100);
  });
  it("still honours sessions created before packs existed", () => {
    expect(creditsForSession({ kind: "CREDITS_10" })).toBe(10);
  });
  it("ignores everything else", () => {
    expect(creditsForSession({ kind: "PACK", pack: "nope" })).toBeNull();
    expect(creditsForSession({ plan: "PRO" })).toBeNull();
    expect(creditsForSession(null)).toBeNull();
  });
});

describe("price ids", () => {
  it("falls back to the old 10-pack variable", () => {
    envMock.values = { STRIPE_PRICE_CREDITS_10: "price_old" };
    expect(priceFor("PACK_10")).toBe("price_old");
    envMock.values = { STRIPE_PRICE_CREDITS_10: "price_old", STRIPE_PRICE_PACK_10: "price_new" };
    expect(priceFor("PACK_10")).toBe("price_new");
    expect(priceFor("PACK_30")).toBeNull();
  });
});
