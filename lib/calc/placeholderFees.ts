import type { FeeSchedule, FeeTier } from "./types";

/**
 * PLACEHOLDER auction fee schedule (Copart/IAAI-like). It is NOT an official fee chart.
 * Admins must replace it with the current official schedules before launch
 * (Admin → Fees). Reports using it show the FEE_TABLE_PLACEHOLDER flag.
 */
export const PLACEHOLDER_BUYER_FEE_TIERS: FeeTier[] = [
  { min: 0, max: 500, amount: 175 },
  { min: 500, max: 1000, amount: 275 },
  { min: 1000, max: 2000, amount: 400 },
  { min: 2000, max: 3000, amount: 500 },
  { min: 3000, max: 4000, amount: 560 },
  { min: 4000, max: 6000, amount: 650 },
  { min: 6000, max: 8000, amount: 750 },
  { min: 8000, max: 10000, amount: 825 },
  { min: 10000, max: 15000, amount: 900 },
  { min: 15000, max: null, bps: 600 },
];

export const PLACEHOLDER_ONLINE_BID_FEE_TIERS: FeeTier[] = [
  { min: 0, max: 1000, amount: 59 },
  { min: 1000, max: 3000, amount: 79 },
  { min: 3000, max: 5000, amount: 89 },
  { min: 5000, max: 8000, amount: 109 },
  { min: 8000, max: null, amount: 129 },
];

export const PLACEHOLDER_FIXED_FEES = [
  { label: "Gate fee", amount: 95 },
  { label: "Environmental fee", amount: 15 },
];

export function placeholderFeeSchedule(
  source: FeeSchedule["source"] = "COPART",
  buyerType: FeeSchedule["buyerType"] = "LICENSED_DEALER",
): FeeSchedule {
  return {
    id: `placeholder-${source.toLowerCase()}-${buyerType.toLowerCase()}`,
    source,
    buyerType,
    name: `${source === "IAAI" ? "IAAI" : "Copart"}-style placeholder (${buyerType === "LICENSED_DEALER" ? "licensed" : "public via broker"})`,
    buyerFeeTiers: PLACEHOLDER_BUYER_FEE_TIERS,
    onlineBidFeeTiers: PLACEHOLDER_ONLINE_BID_FEE_TIERS,
    fixedFees: PLACEHOLDER_FIXED_FEES,
    isPlaceholder: true,
    verifiedAt: null,
    sourceUrl: null,
  };
}
