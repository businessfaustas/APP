import { describe, expect, it } from "vitest";

import { dealPnl, journalSummary, type JournalNumbers } from "@/lib/journal";

const base: JournalNumbers = {
  estimatedRepair: 4865,
  estimatedProfit: 2518,
  purchasePrice: 2900,
  auctionFeesActual: 700,
  transportActual: 360,
  partsActual: 2300,
  laborActual: 2000,
  otherCostsActual: 500,
  salePrice: 12000,
};

describe("deal journal", () => {
  it("computes profit, ROI and repair error", () => {
    const p = dealPnl(base);
    expect(p.totalCost).toBe(8760);
    expect(p.profit).toBe(3240);
    expect(p.roiBps).toBe(3699);
    expect(p.actualRepair).toBe(4300);
    expect(p.repairErrorBps).toBe(-1161);
    expect(p.sold).toBe(true);
  });

  it("unsold deals have no profit", () => {
    const p = dealPnl({ ...base, salePrice: null, partsActual: null, laborActual: null });
    expect(p.profit).toBeNull();
    expect(p.actualRepair).toBeNull();
    expect(p.repairErrorBps).toBeNull();
  });

  it("summarizes", () => {
    const s = journalSummary([base, { ...base, salePrice: 9000, partsActual: 3500 }, { ...base, salePrice: null }]);
    expect(s.deals).toBe(3);
    expect(s.sold).toBe(2);
    expect(s.totalProfit).toBe(3240 + (9000 - 9960));
    expect(s.medianRepairErrorBps).toBe(1161);
    expect(journalSummary([]).avgRoiBps).toBeNull();
  });
});
