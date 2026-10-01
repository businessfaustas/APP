import type { PartSource, PriceRange, RepairLineItem } from "@/lib/domain/schemas";

import type { RepairAggregationSettings, RepairInputs, ScenarioKey } from "./types";

/** Hidden-damage probability needed for a line to count in each scenario. */
export const HIDDEN_THRESHOLDS: Record<ScenarioKey, number> = {
  best: Number.POSITIVE_INFINITY, // hidden damage excluded
  expected: 0.5,
  worst: 0.2,
};

const FALLBACK_ORDER: PartSource[] = ["AFTERMARKET", "USED", "OEM_NEW"];

export function scenarioContingencyBps(baseBps: number, scenario: ScenarioKey): number {
  if (scenario === "best") return Math.max(500, baseBps - 500);
  if (scenario === "worst") return baseBps + 1000;
  return baseBps;
}

export function contingencyForSeverity(severity: number): number {
  if (severity <= 3) return 1000;
  if (severity <= 6) return 1500;
  if (severity <= 8) return 2500;
  return 3500;
}

export function lineIncludedInScenario(item: RepairLineItem, scenario: ScenarioKey): boolean {
  if (!item.included) return false;
  if (item.origin !== "HIDDEN_LIKELY") return true;
  return item.probability >= HIDDEN_THRESHOLDS[scenario];
}

function availableSources(item: RepairLineItem): { source: PartSource; range: PriceRange }[] {
  const out: { source: PartSource; range: PriceRange }[] = [];
  for (const source of ["OEM_NEW", "AFTERMARKET", "USED"] as const) {
    const range = item.prices[source];
    if (range) out.push({ source, range });
  }
  return out;
}

/** Which source a line uses in the expected scenario (used for display too). */
export function expectedSource(item: RepairLineItem, preference: PartSource): PartSource | null {
  if (item.selectedSource && item.prices[item.selectedSource]) return item.selectedSource;
  const order = [preference, ...FALLBACK_ORDER.filter((s) => s !== preference)];
  for (const s of order) if (item.prices[s]) return s;
  return null;
}

/** Price of one line in one scenario, per the scenario rules. */
export function linePrice(item: RepairLineItem, scenario: ScenarioKey, preference: PartSource): number {
  if (item.priceOverride !== null) return item.priceOverride;
  const sources = availableSources(item);
  if (sources.length === 0) return 0;

  if (item.selectedSource && item.prices[item.selectedSource]) {
    const r = item.prices[item.selectedSource]!;
    return scenario === "best" ? r.low : scenario === "expected" ? r.mid : r.high;
  }
  if (scenario === "best") return Math.min(...sources.map((s) => s.range.low));
  if (scenario === "expected") {
    const src = expectedSource(item, preference);
    return src ? item.prices[src]!.mid : 0;
  }
  const oem = item.prices.OEM_NEW;
  if (oem) return oem.high;
  return Math.max(...sources.map((s) => s.range.high));
}

function pickHours(h: { low: number; mid: number; high: number }, scenario: ScenarioKey): number {
  return scenario === "best" ? h.low : scenario === "expected" ? h.mid : h.high;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Aggregates repair line items into the calculator's RepairInputs for one scenario.
 * Pure — runs on the server (pipeline) and in the browser (What-if panel, line edits).
 */
export function aggregateRepair(
  lineItems: readonly RepairLineItem[],
  scenario: ScenarioKey,
  settings: RepairAggregationSettings,
  baseContingencyBps: number,
): RepairInputs {
  let partsCost = 0;
  let subletCost = 0;
  let bodyHours = 0;
  let paintHours = 0;
  let mechHours = 0;
  for (const item of lineItems) {
    if (!lineIncludedInScenario(item, scenario)) continue;
    const price = linePrice(item, scenario, settings.partsSourcePreference);
    if (item.kind === "SUBLET") subletCost += price;
    else partsCost += price;
    bodyHours += pickHours(item.bodyHours, scenario);
    paintHours += pickHours(item.paintHours, scenario);
    mechHours += pickHours(item.mechHours, scenario);
  }
  const base = settings.contingencyOverrideBps ?? baseContingencyBps;
  return {
    partsCost,
    bodyHours: round2(bodyHours),
    paintHours: round2(paintHours),
    mechHours: round2(mechHours),
    subletCost,
    contingencyBps: scenarioContingencyBps(base, scenario),
  };
}
