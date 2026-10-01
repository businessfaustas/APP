import { describe, expect, it } from "vitest";

import { calculate } from "../calculator";
import { REFERENCE_SETTINGS, referenceInput } from "./fixtures";

describe("Audi A3 reference case (master prompt §13.6)", () => {
  const r = calculate(referenceInput(), REFERENCE_SETTINGS);

  it("computes resale, repair, logistics, admin, holding and selling per scenario", () => {
    expect([r.scenarios.best.resale, r.scenarios.expected.resale, r.scenarios.worst.resale]).toEqual([13160, 12390, 11620]);
    expect([r.scenarios.best.repair, r.scenarios.expected.repair, r.scenarios.worst.repair]).toEqual([3839, 4865, 7300]);
    for (const k of ["best", "expected", "worst"] as const) {
      expect(r.scenarios[k].logistics).toBe(360);
      expect(r.scenarios[k].admin).toBe(300);
    }
    expect([r.scenarios.best.holding, r.scenarios.expected.holding, r.scenarios.worst.holding]).toEqual([160, 240, 360]);
    expect([r.scenarios.best.selling, r.scenarios.expected.selling, r.scenarios.worst.selling]).toEqual([263, 248, 232]);
  });

  it("solves the three bid numbers", () => {
    expect(r.targetProfit).toBe(2500);
    expect(r.maxBid).toBe(3100);
    expect(r.comfortBid).toBe(2375);
    expect(r.breakEvenBid).toBe(5500);
  });

  it("itemizes fees at the max bid", () => {
    expect(r.feesAtMaxBid?.total).toBe(759);
    const byLabel = Object.fromEntries((r.feesAtMaxBid?.lines ?? []).map((l) => [l.label, l.amount]));
    expect(byLabel).toEqual({ "Buyer fee": 560, "Online bid fee": 89, "Gate fee": 95, "Environmental fee": 15 });
  });

  it("computes profit, ROI and headroom", () => {
    expect([r.scenarios.best.profitAtMaxBid, r.scenarios.expected.profitAtMaxBid, r.scenarios.worst.profitAtMaxBid]).toEqual([4379, 2518, -791]);
    expect(r.scenarios.expected.totalCostAtMaxBid).toBe(9872);
    expect(r.scenarios.expected.roiAtMaxBidBps).toBe(2551);
    expect(r.scenarios.expected.profitAtCurrentBid).toBe(3588);
    expect(r.headroomBps).toBe(3226);
  });

  it("returns verdict GO with deal score 73", () => {
    expect(r.verdict).toBe("GO");
    expect(r.dealScore).toBe(73);
  });

  it("builds a waterfall that sums to the expected profit", () => {
    const profitRow = r.waterfall.at(-1);
    expect(profitRow?.key).toBe("profit");
    expect(profitRow?.amount).toBe(2518);
  });
});

describe("slider changes", () => {
  it("labor rate $100 → max bid $2,375 and BE_CAUTIOUS (headroom < 15%)", () => {
    const r = calculate(referenceInput(), { ...REFERENCE_SETTINGS, laborRate: 100 });
    expect(r.maxBid).toBe(2375);
    expect(r.verdict).toBe("BE_CAUTIOUS");
    expect(r.verdictReasons.join(" ")).toMatch(/headroom/i);
  });

  it("raising the target profit lowers the max bid", () => {
    const base = calculate(referenceInput(), REFERENCE_SETTINGS);
    const r = calculate(referenceInput(), { ...REFERENCE_SETTINGS, targetProfitMin: 3500 });
    expect(r.maxBid!).toBeLessThan(base.maxBid!);
  });

  it("parts discount raises the max bid", () => {
    const base = calculate(referenceInput(), REFERENCE_SETTINGS);
    const r = calculate(referenceInput(), { ...REFERENCE_SETTINGS, partsDiscountBps: 2000 });
    expect(r.maxBid!).toBeGreaterThan(base.maxBid!);
  });
});
