import { describe, expect, it } from "vitest";

import {
  copartCrashedToysBuyerFeeTiers,
  copartCrashedToysLicensedFees,
  copartCrashedToysVirtualBidTiers,
  COPART_CRASHEDTOYS_LICENSED_URL,
} from "../copartFees";
import { sameFeeTables } from "../feeTables";
import { auctionFees, tierAmount, validateFeeSchedule } from "../fees";
import { placeholderFeeSchedule } from "../placeholderFees";
import type { FeeSchedule } from "../types";

const schedule = (payment: "secured" | "unsecured", bid: "live" | "pre" = "live"): FeeSchedule => ({
  id: "t",
  source: "COPART",
  buyerType: "LICENSED_DEALER",
  isPlaceholder: true,
  ...copartCrashedToysLicensedFees(payment, bid),
});

describe("Copart CrashedToys licensed fees", () => {
  it("passes the app's own checks (no gaps, fees never fall as the bid rises)", () => {
    for (const payment of ["secured", "unsecured"] as const) {
      for (const bid of ["live", "pre"] as const) {
        expect(validateFeeSchedule(schedule(payment, bid))).toEqual({ ok: true, errors: [] });
      }
    }
  });

  it("matches the page for secured payment", () => {
    const t = copartCrashedToysBuyerFeeTiers("secured");
    expect(tierAmount(t, 0)).toBe(30);
    expect(tierAmount(t, 49)).toBe(30);
    expect(tierAmount(t, 50)).toBe(45);
    expect(tierAmount(t, 499)).toBe(150);
    expect(tierAmount(t, 1299)).toBe(335);
    expect(tierAmount(t, 1300)).toBe(335);
    expect(tierAmount(t, 2999)).toBe(570);
    expect(tierAmount(t, 3100)).toBe(695);
    expect(tierAmount(t, 4499)).toBe(710);
    expect(tierAmount(t, 5000)).toBe(780);
    expect(tierAmount(t, 8999)).toBe(1025);
    expect(tierAmount(t, 9999)).toBe(1050);
    expect(tierAmount(t, 10000)).toBe(1050); // 10.5% of 10,000
    expect(tierAmount(t, 20000)).toBe(2100);
  });

  it("matches the page for unsecured payment", () => {
    const t = copartCrashedToysBuyerFeeTiers("unsecured");
    expect(tierAmount(t, 100)).toBe(80);
    expect(tierAmount(t, 3100)).toBe(905);
    expect(tierAmount(t, 4500)).toBe(990);
    expect(tierAmount(t, 9999)).toBe(1550);
    expect(tierAmount(t, 10000)).toBe(1550); // 15.5% of 10,000
    expect(tierAmount(t, 20000)).toBe(3100);
  });

  it("is never cheaper unsecured than secured", () => {
    const secured = copartCrashedToysBuyerFeeTiers("secured");
    const unsecured = copartCrashedToysBuyerFeeTiers("unsecured");
    for (let bid = 0; bid <= 30000; bid += 25) expect(tierAmount(unsecured, bid)).toBeGreaterThanOrEqual(tierAmount(secured, bid));
  });

  it("rounds the three half-dollar fees up to whole dollars", () => {
    expect(tierAmount(copartCrashedToysBuyerFeeTiers("secured"), 350)).toBe(133); // $132.50
    expect(tierAmount(copartCrashedToysBuyerFeeTiers("unsecured"), 0)).toBe(33); // $32.50
    expect(tierAmount(copartCrashedToysBuyerFeeTiers("unsecured"), 300)).toBe(148); // $147.50
    for (const payment of ["secured", "unsecured"] as const) {
      for (const tier of copartCrashedToysBuyerFeeTiers(payment)) if (tier.amount !== undefined) expect(Number.isInteger(tier.amount)).toBe(true);
    }
  });

  it("virtual bid fee: free under $100, Live Bid above Pre-Bid", () => {
    const live = copartCrashedToysVirtualBidTiers("live");
    const pre = copartCrashedToysVirtualBidTiers("pre");
    expect(tierAmount(live, 99)).toBe(0);
    expect(tierAmount(pre, 99)).toBe(0);
    expect(tierAmount(live, 100)).toBe(49);
    expect(tierAmount(pre, 100)).toBe(39);
    expect(tierAmount(live, 3100)).toBe(99);
    expect(tierAmount(live, 7999)).toBe(139);
    expect(tierAmount(live, 8000)).toBe(149);
    expect(tierAmount(pre, 8000)).toBe(129);
  });

  it("adds up a whole purchase: buyer fee + live bid fee + $95 gate + $15 environmental", () => {
    const fees = auctionFees(schedule("secured"), 3100);
    expect(fees.lines.map((l) => [l.label, l.amount])).toEqual([
      ["Buyer fee", 695],
      ["Online bid fee", 99],
      ["Gate fee", 95],
      ["Environmental fee", 15],
    ]);
    expect(fees.total).toBe(904);
  });

  it("names its source and says which column it holds", () => {
    const s = copartCrashedToysLicensedFees();
    expect(s.sourceUrl).toBe(COPART_CRASHEDTOYS_LICENSED_URL);
    expect(s.name).toContain("secured payment");
    expect(s.name).toContain("live bid");
  });
});

describe("sameFeeTables", () => {
  const placeholder = placeholderFeeSchedule("COPART", "LICENSED_DEALER");

  it("recognises an untouched seeded schedule, whatever order the database returns object keys in", () => {
    const fromDb = {
      buyerFeeTiers: placeholder.buyerFeeTiers.map((t) => Object.fromEntries(Object.entries(t).reverse())) as FeeSchedule["buyerFeeTiers"],
      onlineBidFeeTiers: JSON.parse(JSON.stringify(placeholder.onlineBidFeeTiers)),
      fixedFees: JSON.parse(JSON.stringify(placeholder.fixedFees)),
    };
    expect(sameFeeTables(fromDb, placeholder)).toBe(true);
  });

  it("notices any edit", () => {
    const edited = (patch: Partial<FeeSchedule>) => ({ ...JSON.parse(JSON.stringify(placeholder)), ...patch });
    expect(sameFeeTables(edited({}), placeholder)).toBe(true);
    const tier = edited({});
    tier.buyerFeeTiers[0].amount += 1;
    expect(sameFeeTables(tier, placeholder)).toBe(false);
    expect(sameFeeTables(edited({ fixedFees: [] }), placeholder)).toBe(false);
    expect(sameFeeTables(edited({ onlineBidFeeTiers: [] }), placeholder)).toBe(false);
    expect(sameFeeTables(schedule("secured"), placeholder)).toBe(false);
  });
});
