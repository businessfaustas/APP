/**
 * Turns a stored analysis "base" (everything the pipeline gathered) plus the user's
 * assumptions (settings + What-if overrides) into calculator input. Pure and shared by
 * the server pipeline and the browser, so a slider move recomputes exactly what the
 * server computed.
 */
import type { BuyerType, ExitStrategy, PartSource, RepairLineItem, ScenarioValues } from "@/lib/domain/schemas";

import { calculate } from "./calculator";
import { applyBps } from "./money";
import { aggregateRepair } from "./repair";
import type { CalcInput, CalcSettings, CalculationResult, ExportCostInputs, FeeSchedule, ScenarioKey, VerdictSignals } from "./types";
import { SCENARIO_KEYS } from "./types";

export interface ExportProfileData {
  id: string;
  name: string;
  countryCode: string;
  currency: string;
  departurePortZip: string;
  inlandToPortCentsPerMile: number;
  portAndLoading: number;
  oceanFreight: number;
  marineInsuranceBps: number;
  destinationPortFees: number;
  customsBrokerFee: number;
  dutyBps: number;
  vatBps: number;
  vatRecoverableDefault: boolean;
  registrationTax: number;
  complianceConversion: number;
  deliveryFromPort: number;
  isPlaceholder: boolean;
}

export interface AnalysisBase {
  lineItems: RepairLineItem[];
  baseContingencyBps: number;
  /** Clean retail value per scenario, adjusted for mileage and list-to-sale. */
  mvClean: ScenarioValues;
  /** Export-mode resale (USD) per scenario, if known. */
  destinationResale: ScenarioValues | null;
  /**
   * Undamaged retail in the export destination, VAT included as advertised (USD): the resale is derived from it live, so the
   * VAT switch and the rebuilt-value slider in the report change it. Absent on reports made before it existed.
   */
  destinationClean?: { gross: ScenarioValues; vatBps: number } | null;
  distanceMiles: number;
  milesToPort: number | null;
  currentBid: number | null;
  feeSchedules: Record<BuyerType, FeeSchedule>;
  exportProfile: ExportProfileData | null;
  signals: VerdictSignals;
  extraFixedCosts: { label: string; amount: number }[];
}

export interface Assumptions extends Omit<CalcSettings, "exitStrategy"> {
  exitStrategy: ExitStrategy;
  buyerType: BuyerType;
  partsSourcePreference: PartSource;
  contingencyOverrideBps: number | null;
  holdingDaysExpected: number;
  vatRecoverable: boolean;
  /** Expected-case clean value override; best/worst scale proportionally. */
  mvCleanOverride: number | null;
  distanceOverride: number | null;
  currentBidOverride: number | null;
  /** Expected-case export resale override (USD); best/worst scale proportionally. */
  destinationResaleOverride: number | null;
  /** The buyer checked and the AI's frame-damage suspicion is wrong: no warning, no verdict penalty, no frame-pull line. */
  frameDismissed: boolean;
}

export const FRAME_FLAG_CODE = "FRAME_DAMAGE_SUSPECTED";
/** The rule line the estimator adds when the AI suspects frame damage (see lib/estimate/rules.ts). */
export const FRAME_LINE_KEY = "sublet_frame_measure";

/** True for the repair line that exists only because frame damage is suspected. */
export function isFrameRuleLine(l: Pick<RepairLineItem, "partKey" | "origin">): boolean {
  return l.partKey === FRAME_LINE_KEY && l.origin === "RULE";
}

/** Risk flags as the buyer sees them: the frame warning disappears once they have dismissed it. */
export function visibleFlags<F extends { code: string }>(flags: readonly F[], a: Pick<Assumptions, "frameDismissed">): F[] {
  return a.frameDismissed ? flags.filter((f) => f.code !== FRAME_FLAG_CODE) : [...flags];
}

/** Whether the frame-damage suspicion still counts, after the buyer's say. */
export function frameStillSuspected(base: Pick<VerdictSignals, "frameSuspected">, a: Pick<Assumptions, "frameDismissed">): boolean {
  return base.frameSuspected && !a.frameDismissed;
}

/** Shape of the persisted user settings that feed the default assumptions. */
export interface SettingsLike {
  buyerType: BuyerType;
  laborRate: number;
  paintMaterialsPerHour: number;
  partsSourcePreference: PartSource;
  partsDiscountBps: number;
  rebuiltFactorBps: number;
  targetProfitBps: number;
  targetProfitMin: number;
  transportCentsPerMile: number;
  transportMin: number;
  titleRegInspection: number;
  storageDays: number;
  storagePerDay: number;
  holdingCostPerDay: number;
  holdingDaysExpected: number;
  sellingCostBps: number;
  sellingCostFixed: number;
  salesTaxBps: number;
  brokerFee: number;
  contingencyOverrideBps: number | null;
  exitStrategy: ExitStrategy;
  vatRecoverable: boolean;
}

export const DEFAULT_SETTINGS: SettingsLike = {
  buyerType: "LICENSED_DEALER",
  laborRate: 70,
  paintMaterialsPerHour: 40,
  partsSourcePreference: "AFTERMARKET",
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
  holdingDaysExpected: 30,
  sellingCostBps: 200,
  sellingCostFixed: 0,
  salesTaxBps: 0,
  brokerFee: 0,
  contingencyOverrideBps: null,
  exitStrategy: "RETAIL_REBUILT",
  vatRecoverable: false,
};

export function assumptionsFromSettings(s: SettingsLike): Assumptions {
  return {
    laborRate: s.laborRate,
    paintMaterialsPerHour: s.paintMaterialsPerHour,
    partsDiscountBps: s.partsDiscountBps,
    rebuiltFactorBps: s.rebuiltFactorBps,
    targetProfitBps: s.targetProfitBps,
    targetProfitMin: s.targetProfitMin,
    transportCentsPerMile: s.transportCentsPerMile,
    transportMin: s.transportMin,
    titleRegInspection: s.titleRegInspection,
    storageDays: s.storageDays,
    storagePerDay: s.storagePerDay,
    holdingCostPerDay: s.holdingCostPerDay,
    sellingCostBps: s.sellingCostBps,
    sellingCostFixed: s.sellingCostFixed,
    salesTaxBps: s.salesTaxBps,
    brokerFee: s.brokerFee,
    bidIncrement: 25,
    exitStrategy: s.exitStrategy,
    buyerType: s.buyerType,
    partsSourcePreference: s.partsSourcePreference,
    contingencyOverrideBps: s.contingencyOverrideBps,
    holdingDaysExpected: s.holdingDaysExpected,
    vatRecoverable: s.vatRecoverable,
    mvCleanOverride: null,
    distanceOverride: null,
    currentBidOverride: null,
    destinationResaleOverride: null,
    frameDismissed: false,
  };
}

export function holdingDaysFor(expectedDays: number, scenario: ScenarioKey): number {
  if (scenario === "best") return Math.round(expectedDays * 0.67);
  if (scenario === "worst") return Math.round(expectedDays * 1.5);
  return expectedDays;
}

function scaleScenario(values: ScenarioValues, expectedOverride: number | null): ScenarioValues {
  if (expectedOverride === null) return values;
  if (values.expected <= 0) return { best: expectedOverride, expected: expectedOverride, worst: expectedOverride };
  const ratio = expectedOverride / values.expected;
  return {
    best: Math.round(values.best * ratio),
    expected: expectedOverride,
    worst: Math.round(values.worst * ratio),
  };
}

/**
 * The export resale from the researched destination price: take the VAT out when the buyer is VAT-registered (they charge it
 * to their customer and keep none of it), then apply the rebuilt value, since the car is repaired and sold with its history.
 */
export function destinationResaleFrom(
  clean: { gross: ScenarioValues; vatBps: number },
  a: Pick<Assumptions, "vatRecoverable" | "rebuiltFactorBps">,
): ScenarioValues {
  const net = (v: number) => (a.vatRecoverable ? Math.round((v * 10000) / (10000 + clean.vatBps)) : v);
  return {
    best: applyBps(net(clean.gross.best), a.rebuiltFactorBps),
    expected: applyBps(net(clean.gross.expected), a.rebuiltFactorBps),
    worst: applyBps(net(clean.gross.worst), a.rebuiltFactorBps),
  };
}

export function exportCostsFrom(profile: ExportProfileData, milesToPort: number, a: Pick<Assumptions, "transportMin" | "vatRecoverable">): ExportCostInputs {
  return {
    inlandToPort: Math.max(a.transportMin, Math.round((milesToPort * profile.inlandToPortCentsPerMile) / 100)),
    portAndLoading: profile.portAndLoading,
    oceanFreight: profile.oceanFreight,
    marineInsuranceBps: profile.marineInsuranceBps,
    destinationPortFees: profile.destinationPortFees,
    customsBrokerFee: profile.customsBrokerFee,
    dutyBps: profile.dutyBps,
    vatBps: profile.vatBps,
    vatRecoverable: a.vatRecoverable,
    registrationTax: profile.registrationTax,
    complianceConversion: profile.complianceConversion,
    deliveryFromPort: profile.deliveryFromPort,
  };
}

export function settingsFromAssumptions(a: Assumptions, exportMode = false): CalcSettings {
  return {
    laborRate: a.laborRate,
    paintMaterialsPerHour: a.paintMaterialsPerHour,
    partsDiscountBps: a.partsDiscountBps,
    rebuiltFactorBps: a.rebuiltFactorBps,
    targetProfitBps: a.targetProfitBps,
    targetProfitMin: a.targetProfitMin,
    transportCentsPerMile: a.transportCentsPerMile,
    transportMin: a.transportMin,
    titleRegInspection: a.titleRegInspection,
    storageDays: a.storageDays,
    storagePerDay: a.storagePerDay,
    holdingCostPerDay: a.holdingCostPerDay,
    sellingCostBps: a.sellingCostBps,
    sellingCostFixed: a.sellingCostFixed,
    salesTaxBps: a.salesTaxBps,
    brokerFee: a.brokerFee,
    bidIncrement: a.bidIncrement,
    exitStrategy: exportMode ? "EXPORT" : "RETAIL_REBUILT",
  };
}

export function buildCalc(base: AnalysisBase, a: Assumptions): { input: CalcInput; settings: CalcSettings } {
  const mv = scaleScenario(base.mvClean, a.mvCleanOverride);
  const exportMode = a.exitStrategy === "EXPORT" && base.exportProfile !== null;
  const researched = base.destinationResale ?? (base.destinationClean ? destinationResaleFrom(base.destinationClean, a) : null);
  const destination = researched ? scaleScenario(researched, a.destinationResaleOverride) : null;
  const destinationFromOverride =
    a.destinationResaleOverride !== null && !base.destinationResale
      ? { best: a.destinationResaleOverride, expected: a.destinationResaleOverride, worst: a.destinationResaleOverride }
      : null;
  const dest = destination ?? destinationFromOverride;

  const scenarios = {} as CalcInput["scenarios"];
  for (const key of SCENARIO_KEYS) {
    scenarios[key] = {
      mvClean: mv[key],
      ...(exportMode && dest ? { destinationResale: dest[key] } : {}),
      repair: aggregateRepair(base.lineItems, key, a, base.baseContingencyBps),
      holdingDays: holdingDaysFor(a.holdingDaysExpected, key),
    };
  }

  const input: CalcInput = {
    scenarios,
    distanceMiles: a.distanceOverride ?? base.distanceMiles,
    feeSchedule: base.feeSchedules[a.buyerType],
    ...(exportMode && base.exportProfile ? { exportCosts: exportCostsFrom(base.exportProfile, base.milesToPort ?? base.distanceMiles, a) } : {}),
    extraFixedCosts: base.extraFixedCosts,
    currentBid: a.currentBidOverride ?? base.currentBid,
    signals: a.frameDismissed ? { ...base.signals, frameSuspected: false, flags: visibleFlags(base.signals.flags, a) } : base.signals,
  };

  const settings = settingsFromAssumptions(a, exportMode);
  return { input, settings };
}

/** One call for the UI: base + assumptions → full result. */
export function runAnalysisCalc(base: AnalysisBase, a: Assumptions): CalculationResult {
  const { input, settings } = buildCalc(base, a);
  return calculate(input, settings);
}
