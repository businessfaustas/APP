import { applyBps } from "./money";
import type { FeeBreakdown, FeeSchedule, FeeTier } from "./types";

export function findTier(tiers: readonly FeeTier[], bid: number): FeeTier | undefined {
  return tiers.find((t) => bid >= t.min && (t.max === null || bid < t.max));
}

export function tierAmount(tiers: readonly FeeTier[], bid: number): number {
  if (tiers.length === 0) return 0;
  const tier = findTier(tiers, bid);
  if (!tier) throw new Error(`No fee tier covers a bid of $${bid}`);
  if (tier.amount !== undefined) return tier.amount;
  if (tier.bps !== undefined) return Math.max(tier.minAmount ?? 0, applyBps(bid, tier.bps));
  return 0;
}

/** Auction fees for a hammer price: buyer fee + online-bid fee + fixed fees. */
export function auctionFees(schedule: FeeSchedule, bid: number): FeeBreakdown {
  const lines: { label: string; amount: number }[] = [
    { label: "Buyer fee", amount: tierAmount(schedule.buyerFeeTiers, bid) },
    { label: "Online bid fee", amount: tierAmount(schedule.onlineBidFeeTiers, bid) },
    ...schedule.fixedFees.map((f) => ({ label: f.label, amount: f.amount })),
  ].filter((l) => l.amount !== 0);
  return { lines, total: lines.reduce((acc, l) => acc + l.amount, 0) };
}

export interface ScheduleValidation {
  ok: boolean;
  errors: string[];
}

/**
 * Validates a schedule: tiers must cover 0..∞ without gaps and fees must never decrease
 * as the bid rises (checked over 0..50,000 in $25 steps), so the bid solver stays exact.
 */
export function validateFeeSchedule(schedule: Pick<FeeSchedule, "buyerFeeTiers" | "onlineBidFeeTiers" | "fixedFees">): ScheduleValidation {
  const errors: string[] = [];
  for (const [name, tiers] of [
    ["Buyer fee", schedule.buyerFeeTiers],
    ["Online bid fee", schedule.onlineBidFeeTiers],
  ] as const) {
    if (tiers.length === 0) continue;
    const sorted = [...tiers].sort((a, b) => a.min - b.min);
    if (sorted[0]!.min !== 0) errors.push(`${name}: first tier must start at 0`);
    for (let i = 0; i < sorted.length; i++) {
      const t = sorted[i]!;
      if (t.amount === undefined && t.bps === undefined) errors.push(`${name}: tier starting at ${t.min} has no amount or bps`);
      const next = sorted[i + 1];
      if (next && t.max !== next.min) errors.push(`${name}: gap or overlap between ${t.min} and ${next.min}`);
      if (!next && t.max !== null) errors.push(`${name}: last tier must have no upper bound`);
    }
  }
  for (const f of schedule.fixedFees) {
    if (f.amount < 0) errors.push(`Fixed fee "${f.label}" cannot be negative`);
  }
  if (errors.length === 0) {
    const full: FeeSchedule = {
      id: "validate",
      source: "OTHER",
      buyerType: "LICENSED_DEALER",
      name: "validate",
      isPlaceholder: true,
      verifiedAt: null,
      sourceUrl: null,
      ...schedule,
    };
    let prev = -1;
    for (let bid = 0; bid <= 50000; bid += 25) {
      const total = auctionFees(full, bid).total;
      if (total < prev) {
        errors.push(`Fees decrease at a bid of $${bid} — fees must never go down as the bid rises`);
        break;
      }
      prev = total;
    }
  }
  return { ok: errors.length === 0, errors };
}
