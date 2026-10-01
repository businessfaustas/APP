import { placeholderFeeSchedule } from "../placeholderFees";
import type { CalcInput, CalcSettings } from "../types";

export const REFERENCE_SETTINGS: CalcSettings = {
  laborRate: 70,
  paintMaterialsPerHour: 40,
  partsDiscountBps: 0,
  rebuiltFactorBps: 7000,
  targetProfitBps: 1500,
  targetProfitMin: 2500,
  transportCentsPerMile: 150,
  transportMin: 150,
  titleRegInspection: 300,
  storageDays: 0,
  storagePerDay: 0,
  holdingCostPerDay: 8,
  sellingCostBps: 200,
  sellingCostFixed: 0,
  salesTaxBps: 0,
  brokerFee: 0,
  bidIncrement: 25,
  exitStrategy: "RETAIL_REBUILT",
};

export function referenceInput(overrides: Partial<CalcInput> = {}): CalcInput {
  return {
    distanceMiles: 240,
    currentBid: 2100,
    extraFixedCosts: [],
    feeSchedule: placeholderFeeSchedule("COPART", "LICENSED_DEALER"),
    scenarios: {
      best: {
        mvClean: 18800,
        holdingDays: 20,
        repair: { partsCost: 1700, bodyHours: 14, paintHours: 6, mechHours: 0, subletCost: 150, contingencyBps: 1000 },
      },
      expected: {
        mvClean: 17700,
        holdingDays: 30,
        repair: { partsCost: 2070, bodyHours: 16, paintHours: 7, mechHours: 0, subletCost: 270, contingencyBps: 1500 },
      },
      worst: {
        mvClean: 16600,
        holdingDays: 45,
        repair: { partsCost: 2900, bodyHours: 20, paintHours: 8, mechHours: 2, subletCost: 520, contingencyBps: 2500 },
      },
    },
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
    ...overrides,
  };
}
