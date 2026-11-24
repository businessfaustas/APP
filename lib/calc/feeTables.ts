import type { FeeSchedule, FeeTier } from "./types";

/** The parts of a schedule that a reference table fills in. `verifiedAt` stays null until someone has checked it against the auction's own page. */
export type ReferenceFees = Pick<FeeSchedule, "name" | "buyerFeeTiers" | "onlineBidFeeTiers" | "fixedFees" | "sourceUrl" | "verifiedAt">;

/** Turns published rows like [bid from, fee…] into tiers: each tier runs up to the next row's start, the last one is open-ended. `column` picks the fee. */
export function tiersFromRows(rows: readonly (readonly number[])[], column: number): FeeTier[] {
  return rows.map((row, i) => ({ min: row[0]!, max: rows[i + 1]?.[0] ?? null, amount: row[column]! }));
}

/** Ends a table of flat fees at `from` and charges a percentage of the bid (in basis points) from there up. */
export function withPercentTail(tiers: readonly FeeTier[], from: number, bps: number): FeeTier[] {
  const last = tiers[tiers.length - 1]!;
  return [...tiers.slice(0, -1), { ...last, max: from }, { min: from, max: null, bps }];
}

type FeeTables = Pick<FeeSchedule, "buyerFeeTiers" | "onlineBidFeeTiers" | "fixedFees">;

const sameTier = (a: FeeTier, b: FeeTier) => a.min === b.min && a.max === b.max && a.amount === b.amount && a.bps === b.bps && a.minAmount === b.minAmount;
const sameTiers = (a: readonly FeeTier[], b: readonly FeeTier[]) => a.length === b.length && a.every((t, i) => sameTier(t, b[i]!));

/**
 * True when a stored schedule still holds exactly the tables it was seeded with, so nobody has edited it. The seed
 * only replaces schedules like that, never one an admin has touched. Compares values, not JSON text, because the
 * database returns JSON with its keys in a different order.
 */
export function sameFeeTables(a: FeeTables, b: FeeTables): boolean {
  return (
    sameTiers(a.buyerFeeTiers, b.buyerFeeTiers) &&
    sameTiers(a.onlineBidFeeTiers, b.onlineBidFeeTiers) &&
    a.fixedFees.length === b.fixedFees.length &&
    a.fixedFees.every((f, i) => f.label === b.fixedFees[i]!.label && f.amount === b.fixedFees[i]!.amount)
  );
}
