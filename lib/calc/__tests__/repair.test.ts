import { describe, expect, it } from "vitest";

import { findDemoFixtureById } from "@/lib/demo/fixtures";
import type { RepairLineItem } from "@/lib/domain/schemas";

import { assumptionsFromSettings, buildCalc, DEFAULT_SETTINGS, holdingDaysFor, runAnalysisCalc, type AnalysisBase } from "../build";
import { placeholderFeeSchedule } from "../placeholderFees";
import { aggregateRepair, contingencyForSeverity, expectedSource, lineIncludedInScenario, linePrice, scenarioContingencyBps } from "../repair";

const audi = findDemoFixtureById("audi-a3")!;
const prefs = { partsSourcePreference: "AFTERMARKET" as const, contingencyOverrideBps: null };

describe("aggregateRepair on the Audi demo fixture", () => {
  it("reproduces the reference scenario inputs exactly", () => {
    const items = audi.repair.lineItems;
    expect(aggregateRepair(items, "best", prefs, 1500)).toEqual({
      partsCost: 1700,
      bodyHours: 14,
      paintHours: 6,
      mechHours: 0,
      subletCost: 150,
      contingencyBps: 1000,
    });
    expect(aggregateRepair(items, "expected", prefs, 1500)).toEqual({
      partsCost: 2070,
      bodyHours: 16,
      paintHours: 7,
      mechHours: 0,
      subletCost: 270,
      contingencyBps: 1500,
    });
    expect(aggregateRepair(items, "worst", prefs, 1500)).toEqual({
      partsCost: 2900,
      bodyHours: 20,
      paintHours: 8,
      mechHours: 2,
      subletCost: 520,
      contingencyBps: 2500,
    });
  });

  it("buildCalc + calculate with default settings gives the reference result", () => {
    const base: AnalysisBase = {
      lineItems: audi.repair.lineItems,
      baseContingencyBps: audi.repair.baseContingencyBps,
      mvClean: audi.market.mvClean,
      destinationResale: null,
      distanceMiles: audi.distanceMiles,
      milesToPort: null,
      currentBid: 2100,
      feeSchedules: {
        LICENSED_DEALER: placeholderFeeSchedule("COPART", "LICENSED_DEALER"),
        PUBLIC_VIA_BROKER: placeholderFeeSchedule("COPART", "PUBLIC_VIA_BROKER"),
      },
      exportProfile: null,
      signals: {
        severity: 5,
        frameSuspected: false,
        floodSuspected: false,
        airbagsDeployed: false,
        overallConfidence: 0.72,
        flags: [
          { code: "LOW_PHOTO_COVERAGE", level: "MEDIUM" },
          { code: "ADAS_CALIBRATION_LIKELY", level: "INFO" },
          { code: "PREMIUM_PARTS_COST", level: "INFO" },
        ],
      },
      extraFixedCosts: [],
    };
    const a = assumptionsFromSettings(DEFAULT_SETTINGS);
    const r = runAnalysisCalc(base, a);
    expect(r.maxBid).toBe(3100);
    expect(r.comfortBid).toBe(2375);
    expect(r.breakEvenBid).toBe(5500);
    expect(r.verdict).toBe("GO");
    expect(r.dealScore).toBe(73);

    // the labor slider in the browser: $100/h → $2,375 and BE_CAUTIOUS
    const slid = runAnalysisCalc(base, { ...a, laborRate: 100 });
    expect(slid.maxBid).toBe(2375);
    expect(slid.verdict).toBe("BE_CAUTIOUS");

    // overrides
    const mv = buildCalc(base, { ...a, mvCleanOverride: 20000 });
    expect(mv.input.scenarios.expected.mvClean).toBe(20000);
    expect(mv.input.scenarios.best.mvClean).toBe(Math.round(18800 * (20000 / 17700)));
    const d = buildCalc(base, { ...a, distanceOverride: 10, currentBidOverride: 2500, buyerType: "PUBLIC_VIA_BROKER" });
    expect(d.input.distanceMiles).toBe(10);
    expect(d.input.currentBid).toBe(2500);
    expect(d.input.feeSchedule.buyerType).toBe("PUBLIC_VIA_BROKER");
  });

  it("export mode builds export costs from the profile", () => {
    const base: AnalysisBase = {
      lineItems: audi.repair.lineItems,
      baseContingencyBps: 1500,
      mvClean: audi.market.mvClean,
      destinationResale: { best: 22000, expected: 21000, worst: 20000 },
      distanceMiles: 240,
      milesToPort: 1500,
      currentBid: 2100,
      feeSchedules: { LICENSED_DEALER: placeholderFeeSchedule(), PUBLIC_VIA_BROKER: placeholderFeeSchedule("COPART", "PUBLIC_VIA_BROKER") },
      exportProfile: {
        id: "x",
        name: "LT",
        countryCode: "LT",
        currency: "EUR",
        departurePortZip: "07114",
        inlandToPortCentsPerMile: 100,
        portAndLoading: 350,
        oceanFreight: 1450,
        marineInsuranceBps: 150,
        destinationPortFees: 450,
        customsBrokerFee: 250,
        dutyBps: 1000,
        vatBps: 2100,
        vatRecoverableDefault: false,
        registrationTax: 300,
        complianceConversion: 450,
        deliveryFromPort: 150,
        isPlaceholder: true,
      },
      signals: { severity: 5, frameSuspected: false, floodSuspected: false, airbagsDeployed: false, overallConfidence: 0.8, flags: [] },
      extraFixedCosts: [],
    };
    const a = { ...assumptionsFromSettings(DEFAULT_SETTINGS), exitStrategy: "EXPORT" as const };
    const { input, settings } = buildCalc(base, a);
    expect(settings.exitStrategy).toBe("EXPORT");
    expect(input.exportCosts?.inlandToPort).toBe(1500);
    expect(input.scenarios.expected.destinationResale).toBe(21000);
    const r = runAnalysisCalc(base, a);
    expect(r.scenarios.expected.resale).toBe(21000);
    expect(r.acquisitionAtMaxBid?.duty).toBeGreaterThan(0);
    // destination override scales
    const o = buildCalc(base, { ...a, destinationResaleOverride: 23100 });
    expect(o.input.scenarios.expected.destinationResale).toBe(23100);
  });
});

describe("line rules", () => {
  const item = (over: Partial<RepairLineItem>): RepairLineItem => ({ ...audi.repair.lineItems[0]!, ...over });

  it("hidden thresholds per scenario", () => {
    const hidden = item({ origin: "HIDDEN_LIKELY", probability: 0.3 });
    expect(lineIncludedInScenario(hidden, "best")).toBe(false);
    expect(lineIncludedInScenario(hidden, "expected")).toBe(false);
    expect(lineIncludedInScenario(hidden, "worst")).toBe(true);
    expect(lineIncludedInScenario(item({ included: false }), "worst")).toBe(false);
  });

  it("price selection: overrides, selected source and fallbacks", () => {
    const multi = item({
      prices: { OEM_NEW: { low: 500, mid: 600, high: 700 }, AFTERMARKET: { low: 200, mid: 250, high: 300 }, USED: { low: 150, mid: 180, high: 220 } },
    });
    expect(linePrice(multi, "best", "AFTERMARKET")).toBe(150);
    expect(linePrice(multi, "expected", "AFTERMARKET")).toBe(250);
    expect(linePrice(multi, "expected", "OEM_NEW")).toBe(600);
    expect(linePrice(multi, "worst", "AFTERMARKET")).toBe(700);
    expect(linePrice({ ...multi, selectedSource: "USED" }, "worst", "AFTERMARKET")).toBe(220);
    expect(linePrice({ ...multi, priceOverride: 999 }, "best", "AFTERMARKET")).toBe(999);
    expect(expectedSource({ ...multi, prices: { ...multi.prices, AFTERMARKET: null } }, "AFTERMARKET")).toBe("USED");
    expect(linePrice(item({ prices: { OEM_NEW: null, AFTERMARKET: null, USED: null } }), "expected", "AFTERMARKET")).toBe(0);
  });

  it("contingency and holding helpers", () => {
    expect(contingencyForSeverity(2)).toBe(1000);
    expect(contingencyForSeverity(5)).toBe(1500);
    expect(contingencyForSeverity(8)).toBe(2500);
    expect(contingencyForSeverity(10)).toBe(3500);
    expect(scenarioContingencyBps(800, "best")).toBe(500);
    expect(holdingDaysFor(30, "best")).toBe(20);
    expect(holdingDaysFor(30, "worst")).toBe(45);
    expect(aggregateRepair(audi.repair.lineItems, "expected", { ...prefs, contingencyOverrideBps: 2000 }, 1500).contingencyBps).toBe(2000);
  });
});
