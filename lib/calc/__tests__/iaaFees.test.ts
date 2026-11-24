import { describe, expect, it } from "vitest";

import { auctionFees, tierAmount, validateFeeSchedule } from "../fees";
import { iaaBuyerFeeTiers, iaaFees, iaaInternetBidTiers, IAA_LICENSED_URL, IAA_NON_LICENSED_URL } from "../iaaFees";
import { referenceFees } from "../referenceFees";
import type { FeeSchedule } from "../types";

const schedule = (opts: Parameters<typeof iaaFees>[0]): FeeSchedule => ({
  id: "t",
  source: "IAAI",
  buyerType: "LICENSED_DEALER",
  isPlaceholder: true,
  ...iaaFees(opts),
});

describe("IAA fees", () => {
  it("passes the app's own checks (no gaps, fees never fall as the bid rises)", () => {
    for (const licensed of [true, false]) {
      for (const sched of ["standard", "highVolume"] as const) {
        for (const bid of ["live", "proxy"] as const) {
          expect(validateFeeSchedule(schedule({ licensed, schedule: sched, bid }))).toEqual({ ok: true, errors: [] });
        }
      }
    }
  });

  it("standard schedule: the rows read off IAA's page", () => {
    const t = iaaBuyerFeeTiers("standard");
    expect(tierAmount(t, 0)).toBe(25);
    expect(tierAmount(t, 49)).toBe(25);
    expect(tierAmount(t, 50)).toBe(45);
    expect(tierAmount(t, 899)).toBe(295);
    expect(tierAmount(t, 900)).toBe(320);
    expect(tierAmount(t, 2499)).toBe(570);
    expect(tierAmount(t, 2500)).toBe(610);
    expect(tierAmount(t, 3100)).toBe(655);
    expect(tierAmount(t, 8499)).toBe(925);
    expect(tierAmount(t, 8500)).toBe(945);
    expect(tierAmount(t, 9999)).toBe(945);
    expect(tierAmount(t, 10000)).toBe(1000);
    expect(tierAmount(t, 14999)).toBe(1000);
    expect(tierAmount(t, 15000)).toBe(1125); // 7.5% of 15,000
    expect(tierAmount(t, 20000)).toBe(1500);
  });

  it("high-volume schedule: the rows read off IAA's page", () => {
    const t = iaaBuyerFeeTiers("highVolume");
    expect(tierAmount(t, 0)).toBe(1);
    expect(tierAmount(t, 99)).toBe(1);
    expect(tierAmount(t, 100)).toBe(25);
    expect(tierAmount(t, 2500)).toBe(460);
    expect(tierAmount(t, 8500)).toBe(820);
    expect(tierAmount(t, 10000)).toBe(850);
    expect(tierAmount(t, 11500)).toBe(860);
    expect(tierAmount(t, 12000)).toBe(875);
    expect(tierAmount(t, 14999)).toBe(890);
    expect(tierAmount(t, 15000)).toBe(900); // 6.0% of 15,000
    expect(tierAmount(t, 20000)).toBe(1200);
  });

  it("high volume is never dearer than standard", () => {
    const standard = iaaBuyerFeeTiers("standard");
    const highVolume = iaaBuyerFeeTiers("highVolume");
    for (let bid = 0; bid <= 40000; bid += 25) expect(tierAmount(highVolume, bid)).toBeLessThanOrEqual(tierAmount(standard, bid));
  });

  it("agrees with the figures independent write-ups quote for the standard schedule", () => {
    const t = iaaBuyerFeeTiers("standard");
    expect(tierAmount(t, 900)).toBe(320); // "$320 on a $900 bid"
    expect(tierAmount(t, 2500)).toBe(610); // "$610 on a $2,500 car"
    expect(tierAmount(t, 10000)).toBe(1000); // "$1,000 on a $10,000 car"
    expect(tierAmount(iaaInternetBidTiers("live"), 900)).toBe(65); // "$65 for the live bid"
  });

  it("rounds the one half-dollar fee up to whole dollars", () => {
    expect(tierAmount(iaaBuyerFeeTiers("standard"), 300)).toBe(138); // $137.50
    for (const sched of ["standard", "highVolume"] as const) {
      for (const tier of iaaBuyerFeeTiers(sched)) if (tier.amount !== undefined) expect(Number.isInteger(tier.amount)).toBe(true);
    }
  });

  it("internet bid fee: free under $100, Live Online above Proxy", () => {
    const live = iaaInternetBidTiers("live");
    const proxy = iaaInternetBidTiers("proxy");
    expect(tierAmount(live, 99)).toBe(0);
    expect(tierAmount(proxy, 99)).toBe(0);
    expect(tierAmount(live, 100)).toBe(50);
    expect(tierAmount(proxy, 100)).toBe(40);
    expect(tierAmount(live, 3100)).toBe(110);
    expect(tierAmount(proxy, 3100)).toBe(100);
    expect(tierAmount(live, 7999)).toBe(145);
    expect(tierAmount(live, 8000)).toBe(160);
    expect(tierAmount(proxy, 8000)).toBe(140);
  });

  it("adds up a whole purchase: buyer fee + live online bid fee + $105 service + $20 title", () => {
    const fees = auctionFees(schedule({ licensed: false }), 3100);
    expect(fees.lines.map((l) => [l.label, l.amount])).toEqual([
      ["Buyer fee", 655],
      ["Online bid fee", 110],
      ["Service fee", 105],
      ["Title handling", 20],
    ]);
    expect(fees.total).toBe(890);
  });

  it("is loaded unverified: no Verified date, and it names IAA's page as the source", () => {
    expect(iaaFees({ licensed: true }).verifiedAt).toBeNull();
    expect(iaaFees({ licensed: false }).verifiedAt).toBeNull();
    expect(iaaFees({ licensed: true }).sourceUrl).toBe(IAA_LICENSED_URL);
    expect(iaaFees({ licensed: false }).sourceUrl).toBe(IAA_NON_LICENSED_URL);
    expect(iaaFees({ licensed: true }).name).toContain("unchecked");
  });
});

describe("referenceFees", () => {
  it("has tables for Copart licensed and both IAAI cards, and only those", () => {
    expect(referenceFees("COPART", "LICENSED_DEALER")?.name).toContain("CrashedToys");
    expect(referenceFees("COPART", "LICENSED_DEALER")?.verifiedAt).toBe("2026-11-24");
    expect(referenceFees("IAAI", "LICENSED_DEALER")?.name).toContain("IAAI standard");
    expect(referenceFees("IAAI", "PUBLIC_VIA_BROKER")?.name).toContain("IAAI standard");
    expect(referenceFees("COPART", "PUBLIC_VIA_BROKER")).toBeNull();
    expect(referenceFees("OTHER", "LICENSED_DEALER")).toBeNull();
  });
});
