import { describe, expect, it } from "vitest";

import { acquisitionAt, calculate, computeRepair } from "../calculator";
import { auctionFees, tierAmount, validateFeeSchedule } from "../fees";
import { formatUsdPlain } from "../format";
import { applyBps, bpsToPct, clamp, hoursCost, pctToBps, ratioBps, sum } from "../money";
import { placeholderFeeSchedule, PLACEHOLDER_BUYER_FEE_TIERS } from "../placeholderFees";
import { solveBid } from "../solver";
import type { ExportCostInputs } from "../types";
import { REFERENCE_SETTINGS, referenceInput } from "./fixtures";

const schedule = placeholderFeeSchedule();

describe("money helpers", () => {
  it("applyBps rounds half-up with exact integer math", () => {
    expect(applyBps(4230, 11500)).toBe(4865);
    expect(applyBps(12390, 200)).toBe(248);
    expect(applyBps(11620, 200)).toBe(232);
    expect(applyBps(17700, 7000)).toBe(12390);
    expect(applyBps(0, 1500)).toBe(0);
  });
  it("other helpers", () => {
    expect(hoursCost(23, 70)).toBe(1610);
    expect(hoursCost(0.1 + 0.2, 100)).toBe(30);
    expect(ratioBps(1, 4)).toBe(2500);
    expect(ratioBps(1, 0)).toBeNull();
    expect(sum([1, 2, 3])).toBe(6);
    expect(clamp(120, 0, 100)).toBe(100);
    expect(pctToBps(15.5)).toBe(1550);
    expect(bpsToPct(1550)).toBe(15.5);
    expect(formatUsdPlain(-791)).toBe("−$791");
    expect(formatUsdPlain(12390)).toBe("$12,390");
  });
});

describe("fees", () => {
  it("handles tier boundaries (min inclusive, max exclusive)", () => {
    expect(tierAmount(PLACEHOLDER_BUYER_FEE_TIERS, 2999)).toBe(500);
    expect(tierAmount(PLACEHOLDER_BUYER_FEE_TIERS, 3000)).toBe(560);
    expect(tierAmount(PLACEHOLDER_BUYER_FEE_TIERS, 14999)).toBe(900);
    expect(tierAmount(PLACEHOLDER_BUYER_FEE_TIERS, 15000)).toBe(900); // 6% of 15,000
    expect(tierAmount(PLACEHOLDER_BUYER_FEE_TIERS, 20000)).toBe(1200);
    expect(auctionFees(schedule, 0).total).toBe(175 + 59 + 95 + 15);
  });

  it("acquisition never decreases as the bid rises (0..50,000)", () => {
    let prev = -1;
    for (let b = 0; b <= 50000; b += 25) {
      const a = acquisitionAt(referenceInput(), REFERENCE_SETTINGS, b).total;
      expect(a).toBeGreaterThanOrEqual(prev);
      prev = a;
    }
  });

  it("validates schedules", () => {
    expect(validateFeeSchedule(schedule).ok).toBe(true);
    const gap = validateFeeSchedule({
      ...schedule,
      buyerFeeTiers: [
        { min: 0, max: 100, amount: 10 },
        { min: 200, max: null, amount: 20 },
      ],
    });
    expect(gap.ok).toBe(false);
    const decreasing = validateFeeSchedule({
      ...schedule,
      buyerFeeTiers: [
        { min: 0, max: 1000, amount: 300 },
        { min: 1000, max: null, amount: 50 },
      ],
    });
    expect(decreasing.ok).toBe(false);
    expect(decreasing.errors[0]).toMatch(/decrease/);
    const noStart = validateFeeSchedule({ ...schedule, onlineBidFeeTiers: [{ min: 10, max: null, amount: 5 }] });
    expect(noStart.ok).toBe(false);
    const negative = validateFeeSchedule({ ...schedule, fixedFees: [{ label: "x", amount: -1 }] });
    expect(negative.ok).toBe(false);
  });

  it("throws when no tier covers the bid", () => {
    expect(() => tierAmount([{ min: 100, max: null, amount: 1 }], 50)).toThrow();
  });
});

describe("solver", () => {
  it("returns null when even $0 is over budget", () => {
    expect(solveBid(100, () => 344, 25, 10000)).toBeNull();
  });
  it("finds the largest increment within budget", () => {
    expect(solveBid(1000, (b) => b, 25, 10000)).toBe(1000);
    expect(solveBid(1010, (b) => b, 25, 10000)).toBe(1000);
    expect(solveBid(1000000, (b) => b, 25, 500)).toBe(500);
  });
  it("rejects a non-positive increment", () => {
    expect(() => solveBid(100, (b) => b, 0, 100)).toThrow();
  });
});

describe("verdicts", () => {
  it("WALK_AWAY with null max bid and score 0 when costs exceed resale", () => {
    const input = referenceInput();
    input.scenarios.expected.mvClean = 5000;
    input.scenarios.worst.mvClean = 4000;
    input.scenarios.best.mvClean = 6000;
    const r = calculate(input, REFERENCE_SETTINGS);
    expect(r.maxBid).toBeNull();
    expect(r.verdict).toBe("WALK_AWAY");
    expect(r.dealScore).toBe(0);
    expect(r.scenarios.expected.profitAtMaxBid).toBeNull();
    expect(r.feesAtMaxBid).toBeNull();
  });

  it("WALK_AWAY when the current bid is above the max bid", () => {
    const r = calculate(referenceInput({ currentBid: 3500 }), REFERENCE_SETTINGS);
    expect(r.verdict).toBe("WALK_AWAY");
    expect(r.verdictReasons[0]).toMatch(/already above/);
  });

  it("WALK_AWAY on a HARD_STOP flag regardless of numbers", () => {
    const input = referenceInput();
    input.signals.flags = [...input.signals.flags, { code: "TITLE_NON_REPAIRABLE", level: "HARD_STOP", title: "Non-repairable title" }];
    const r = calculate(input, REFERENCE_SETTINGS);
    expect(r.verdict).toBe("WALK_AWAY");
    expect(r.verdictReasons).toContain("Non-repairable title");
  });

  it("BE_CAUTIOUS triggers", () => {
    const sev = referenceInput();
    sev.signals.severity = 8;
    expect(calculate(sev, REFERENCE_SETTINGS).verdict).toBe("BE_CAUTIOUS");

    const frame = referenceInput();
    frame.signals.frameSuspected = true;
    expect(calculate(frame, REFERENCE_SETTINGS).verdict).toBe("BE_CAUTIOUS");

    const flood = referenceInput();
    flood.signals.floodSuspected = true;
    expect(calculate(flood, REFERENCE_SETTINGS).verdict).toBe("BE_CAUTIOUS");

    const conf = referenceInput();
    conf.signals.overallConfidence = 0.4;
    expect(calculate(conf, REFERENCE_SETTINGS).verdict).toBe("BE_CAUTIOUS");

    const highs = referenceInput();
    highs.signals.flags = [
      { code: "A", level: "HIGH" },
      { code: "B", level: "HIGH" },
    ];
    expect(calculate(highs, REFERENCE_SETTINGS).verdict).toBe("BE_CAUTIOUS");

    const worst = referenceInput();
    worst.scenarios.worst.repair.partsCost = 5000;
    const w = calculate(worst, REFERENCE_SETTINGS);
    expect(w.verdict).toBe("BE_CAUTIOUS");
    expect(w.verdictReasons.join(" ")).toMatch(/Worst case loses/);
  });

  it("deal score penalties", () => {
    const input = referenceInput();
    input.signals = { ...input.signals, frameSuspected: true, floodSuspected: true, airbagsDeployed: true, overallConfidence: 0.55 };
    input.signals.flags = [
      { code: "FRAME_DAMAGE_SUSPECTED", level: "HIGH" },
      { code: "OTHER_HIGH", level: "HIGH" },
    ];
    const r = calculate(input, REFERENCE_SETTINGS);
    // 100 − 15 − 20 − 25 − 8 − 10 − 15 (worst < 0) − 5 (OTHER_HIGH) + 5 (ROI) = 7
    expect(r.dealScore).toBe(7);
  });

  it("no current bid → no headroom and no current-bid profit", () => {
    const r = calculate(referenceInput({ currentBid: null }), REFERENCE_SETTINGS);
    expect(r.headroomBps).toBeNull();
    expect(r.scenarios.expected.profitAtCurrentBid).toBeNull();
    expect(r.verdict).toBe("GO");
  });
});

describe("repair cost", () => {
  it("applies the parts discount before contingency", () => {
    const r = computeRepair(
      { partsCost: 1000, bodyHours: 1, paintHours: 1, mechHours: 0, subletCost: 0, contingencyBps: 0 },
      { partsDiscountBps: 1000, laborRate: 50, paintMaterialsPerHour: 30 },
    );
    expect(r.breakdown).toEqual({ parts: 900, labor: 100, paintMaterials: 30, sublets: 0, contingency: 0 });
    expect(r.total).toBe(1030);
  });
});

describe("costs that depend on settings", () => {
  it("sales tax and broker fee raise acquisition and lower the max bid", () => {
    const base = calculate(referenceInput(), REFERENCE_SETTINGS);
    const r = calculate(referenceInput(), { ...REFERENCE_SETTINGS, salesTaxBps: 825, brokerFee: 299 });
    expect(r.acquisitionAtMaxBid?.salesTax).toBe(applyBps(r.maxBid!, 825));
    expect(r.acquisitionAtMaxBid?.brokerFee).toBe(299);
    expect(r.maxBid!).toBeLessThan(base.maxBid!);
  });

  it("storage and extra costs feed admin and extras", () => {
    const r = calculate(referenceInput({ extraFixedCosts: [{ label: "Keys", amount: 250 }] }), {
      ...REFERENCE_SETTINGS,
      storageDays: 3,
      storagePerDay: 20,
    });
    expect(r.scenarios.expected.admin).toBe(360);
    expect(r.scenarios.expected.extras).toBe(250);
  });

  it("transport minimum applies for short distances", () => {
    const r = calculate(referenceInput({ distanceMiles: 10 }), REFERENCE_SETTINGS);
    expect(r.scenarios.expected.logistics).toBe(150);
  });
});

describe("export mode", () => {
  const exportCosts: ExportCostInputs = {
    inlandToPort: 900,
    portAndLoading: 350,
    oceanFreight: 1400,
    marineInsuranceBps: 150,
    destinationPortFees: 400,
    customsBrokerFee: 250,
    dutyBps: 1000,
    vatBps: 2100,
    vatRecoverable: false,
    registrationTax: 300,
    complianceConversion: 450,
    deliveryFromPort: 200,
  };
  const settings = { ...REFERENCE_SETTINGS, exitStrategy: "EXPORT" as const };

  function exportInput(vatRecoverable: boolean) {
    const input = referenceInput({ exportCosts: { ...exportCosts, vatRecoverable } });
    input.scenarios.best.destinationResale = 21000;
    input.scenarios.expected.destinationResale = 19500;
    input.scenarios.worst.destinationResale = 18000;
    return input;
  }

  it("computes duty and VAT on CIF", () => {
    const input = exportInput(false);
    const a = acquisitionAt(input, settings, 3000);
    const fees = auctionFees(input.feeSchedule, 3000).total; // 759
    const insurance = applyBps(3000 + fees, 150);
    const cif = 3000 + fees + 0 + 900 + 350 + 1400 + insurance;
    expect(a.marineInsurance).toBe(insurance);
    expect(a.duty).toBe(applyBps(cif, 1000));
    expect(a.vat).toBe(applyBps(cif + a.duty, 2100));
    expect(a.total).toBe(3000 + fees + insurance + a.duty + a.vat);
  });

  it("uses destination resale (no rebuilt factor) and fixed export logistics", () => {
    const r = calculate(exportInput(false), settings);
    expect(r.scenarios.expected.resale).toBe(19500);
    expect(r.scenarios.expected.logistics).toBe(900 + 350 + 1400 + 400 + 250 + 300 + 450 + 200);
  });

  it("vatRecoverable removes VAT and raises the max bid", () => {
    const withVat = calculate(exportInput(false), settings);
    const noVat = calculate(exportInput(true), settings);
    expect(noVat.acquisitionAtMaxBid?.vat).toBe(0);
    expect(noVat.maxBid!).toBeGreaterThan(withVat.maxBid!);
  });
});
