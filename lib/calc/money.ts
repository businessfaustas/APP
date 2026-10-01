/**
 * Integer money helpers. The financial engine never uses floating-point percentages:
 * amounts are whole dollars and rates are basis points.
 */

/** amount × bps / 10000, rounded half-up (for non-negative inputs). */
export function applyBps(amount: number, bps: number): number {
  return Math.round((amount * bps) / 10000);
}

/** hours × rate, rounded to whole dollars. */
export function hoursCost(hours: number, rate: number): number {
  return Math.round(hours * rate);
}

/** (numerator / denominator) in bps, rounded. Returns null when denominator is 0. */
export function ratioBps(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return Math.round((numerator / denominator) * 10000);
}

export function sum(values: readonly number[]): number {
  let total = 0;
  for (const v of values) total += v;
  return total;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Percent (e.g. 15 or 15.5) → bps (1500 / 1550). */
export function pctToBps(pct: number): number {
  return Math.round(pct * 100);
}

/** bps → percent number (1550 → 15.5). */
export function bpsToPct(bps: number): number {
  return bps / 100;
}
