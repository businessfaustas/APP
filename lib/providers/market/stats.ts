/** Pure market statistics: percentiles, mileage regression, adjustments. Unit tested. */
import { applyBps } from "@/lib/calc/money";
import type { Comp, ScenarioValues } from "@/lib/domain/schemas";

/** Linear-interpolated percentile (p in 0..100) of a numeric array. */
export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  const frac = rank - lo;
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * frac;
}

export function median(values: readonly number[]): number {
  return percentile(values, 50);
}

/** Ordinary least squares slope of y on x. Returns null if x has no variance. */
export function olsSlope(xs: readonly number[], ys: readonly number[]): number | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return null;
  const mx = xs.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const my = ys.slice(0, n).reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i]! - mx) * (ys[i]! - my);
    den += (xs[i]! - mx) ** 2;
  }
  return den === 0 ? null : num / den;
}

export const DEFAULT_SLOPE = -0.08;
export const SLOPE_BOUNDS: [number, number] = [-0.25, 0];

/** $/mile slope: OLS with ≥ 8 comps (clamped), otherwise the default. */
export function mileageSlope(comps: readonly Pick<Comp, "price" | "mileage">[]): number {
  const usable = comps.filter((c): c is Pick<Comp, "price"> & { mileage: number } => c.mileage !== null);
  if (usable.length < 8) return DEFAULT_SLOPE;
  const slope = olsSlope(
    usable.map((c) => c.mileage),
    usable.map((c) => c.price),
  );
  if (slope === null) return DEFAULT_SLOPE;
  return Math.min(SLOPE_BOUNDS[1], Math.max(SLOPE_BOUNDS[0], slope));
}

/** Adjusts each comp's price to the subject mileage. */
export function adjustComps(comps: readonly Comp[], subjectMileage: number | null, slope: number): Comp[] {
  return comps.map((c) => ({
    ...c,
    adjustedPrice: subjectMileage !== null && c.mileage !== null ? Math.round(c.price + (subjectMileage - c.mileage) * slope) : c.price,
  }));
}

/** P25/P50/P75 of adjusted comps × list-to-sale ratio → clean value per scenario. */
export function scenarioValues(adjusted: readonly Comp[], listToSaleBps: number): ScenarioValues {
  const prices = adjusted.map((c) => c.adjustedPrice);
  return {
    worst: applyBps(Math.round(percentile(prices, 25)), listToSaleBps),
    expected: applyBps(Math.round(percentile(prices, 50)), listToSaleBps),
    best: applyBps(Math.round(percentile(prices, 75)), listToSaleBps),
  };
}

/** 0–1 confidence from the number of comps and the price spread. */
export function compsConfidence(adjusted: readonly Comp[]): number {
  const n = adjusted.length;
  if (n === 0) return 0;
  const prices = adjusted.map((c) => c.adjustedPrice);
  const med = median(prices);
  const spread = med > 0 ? (percentile(prices, 75) - percentile(prices, 25)) / med : 1;
  const countScore = Math.min(1, n / 12);
  const spreadScore = Math.max(0, 1 - spread * 2.5);
  return Math.round((0.35 + 0.4 * countScore + 0.25 * spreadScore) * 100) / 100;
}
