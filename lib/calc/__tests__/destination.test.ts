import { describe, expect, it } from "vitest";

import { findDemoFixtureById } from "@/lib/demo/fixtures";

import { assumptionsFromSettings, DEFAULT_SETTINGS, destinationResaleFrom, runAnalysisCalc, type AnalysisBase, type ExportProfileData } from "../build";
import { placeholderFeeSchedule } from "../placeholderFees";

const audi = findDemoFixtureById("audi-a3")!;

const profile: ExportProfileData = {
  id: "p1",
  name: "Lithuania via Klaipėda (container)",
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
};

function base(extra: Partial<AnalysisBase> = {}): AnalysisBase {
  return {
    lineItems: audi.repair.lineItems,
    baseContingencyBps: audi.repair.baseContingencyBps,
    mvClean: audi.market.mvClean,
    destinationResale: null,
    distanceMiles: audi.distanceMiles,
    milesToPort: 300,
    currentBid: null,
    feeSchedules: {
      LICENSED_DEALER: placeholderFeeSchedule("COPART", "LICENSED_DEALER"),
      PUBLIC_VIA_BROKER: placeholderFeeSchedule("COPART", "PUBLIC_VIA_BROKER"),
    },
    exportProfile: profile,
    signals: { severity: 5, frameSuspected: false, floodSuspected: false, airbagsDeployed: false, overallConfidence: 0.8, flags: [] },
    extraFixedCosts: [],
    ...extra,
  };
}

const clean = { gross: { best: 52_000, expected: 50_000, worst: 48_000 }, vatBps: 2100 };
const exportA = { ...assumptionsFromSettings(DEFAULT_SETTINGS), exitStrategy: "EXPORT" as const, rebuiltFactorBps: 8000 };

describe("the export resale from the researched destination price", () => {
  it("takes the VAT out for a VAT-registered buyer and applies the rebuilt value", () => {
    const registered = destinationResaleFrom(clean, { vatRecoverable: true, rebuiltFactorBps: 8000 });
    // 50,000 / 1.21 = 41,322 (rounded), x 80%
    expect(registered.expected).toBe(Math.round(41_322 * 0.8));
    expect(registered.worst).toBeLessThan(registered.expected);
    expect(registered.best).toBeGreaterThan(registered.expected);
  });

  it("keeps the advertised price for a buyer without a VAT number, who can't recover anything", () => {
    expect(destinationResaleFrom(clean, { vatRecoverable: false, rebuiltFactorBps: 8000 }).expected).toBe(40_000);
  });

  it("follows the VAT switch and the rebuilt value live, in the same calculation as the import VAT", () => {
    const without = runAnalysisCalc(base({ destinationClean: clean }), { ...exportA, vatRecoverable: false });
    const withVat = runAnalysisCalc(base({ destinationClean: clean }), { ...exportA, vatRecoverable: true });
    expect(without.scenarios.expected.resale).toBe(40_000);
    expect(withVat.scenarios.expected.resale).toBe(Math.round(41_322 * 0.8));
    // a VAT number lowers what the car sells for (no VAT kept) but also removes the VAT paid on import
    expect(withVat.scenarios.expected.resale).toBeLessThan(without.scenarios.expected.resale);
    expect(withVat.acquisitionAtMaxBid!.vat).toBe(0);
    expect(without.acquisitionAtMaxBid!.vat).toBeGreaterThan(0);

    const lowerFactor = runAnalysisCalc(base({ destinationClean: clean }), { ...exportA, vatRecoverable: false, rebuiltFactorBps: 6000 });
    expect(lowerFactor.scenarios.expected.resale).toBe(30_000);
  });

  it("lets the buyer's own destination price override the researched one, scaling best and worst with it", () => {
    const r = runAnalysisCalc(base({ destinationClean: clean }), { ...exportA, destinationResaleOverride: 45_000 });
    expect(r.scenarios.expected.resale).toBe(45_000);
    expect(r.scenarios.best.resale).toBeGreaterThan(45_000);
    expect(r.scenarios.worst.resale).toBeLessThan(45_000);
  });

  it("still takes a typed price when nothing was researched, and does nothing for a US retail report", () => {
    const typed = runAnalysisCalc(base(), { ...exportA, destinationResaleOverride: 33_000 });
    expect(typed.scenarios.expected.resale).toBe(33_000);

    // the reference case: retail strategy ignores the destination entirely
    const us = runAnalysisCalc(base({ destinationClean: clean, exportProfile: null }), assumptionsFromSettings(DEFAULT_SETTINGS));
    expect(us.scenarios.expected.resale).toBe(
      runAnalysisCalc(base({ exportProfile: null }), assumptionsFromSettings(DEFAULT_SETTINGS)).scenarios.expected.resale,
    );
  });

  it("reports made before the destination price existed (no field at all) still calculate", () => {
    const legacy = base();
    delete (legacy as { destinationClean?: unknown }).destinationClean;
    expect(() => runAnalysisCalc(legacy, exportA)).not.toThrow();
  });
});
