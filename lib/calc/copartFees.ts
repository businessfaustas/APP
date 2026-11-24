import type { FeeSchedule, FeeTier } from "./types";

/**
 * Copart's published "CrashedToys Licensed Fees — Preferred Pricing" table, copied by the site owner from
 * https://www.copart.com/content/us/en/member-fees-crashedtoys-licensed on 2026-11-24.
 *
 * Read this before relying on it:
 *  - CrashedToys is Copart's brand for powersports and recreational vehicles. The page does not say this is the table
 *    for cars, trucks and SUVs, so the schedule is loaded **still flagged as a placeholder** until the owner has
 *    checked it against the Member Fees page in a signed-in Copart account.
 *  - The page publishes two payment columns. A schedule holds one, so the default is secured payment (wire and other
 *    secured funds); pass "unsecured" for card and other non-secure funds, which costs more.
 *  - The page publishes a Pre-Bid and a Live Bid virtual-bid fee. The default is Live Bid, the higher one, so a maximum
 *    bid is never overstated.
 *  - Money here is whole dollars, so the few half-dollar fees on the page ($132.50, $32.50, $147.50) are rounded up.
 *  - Late-payment ($50), relist (10%, minimum $600), third-party finance ($39) and storage fees only apply when something
 *    goes wrong or varies by yard, so they are not part of the acquisition cost.
 *
 * Not used by the demo account or the tests, which keep the placeholder schedule (the Audi A3 reference case).
 */

export const COPART_CRASHEDTOYS_LICENSED_URL = "https://www.copart.com/content/us/en/member-fees-crashedtoys-licensed";
export const COPART_CRASHEDTOYS_LICENSED_VERIFIED_ON = "2026-11-24";

/** [bid from (inclusive), secured payment fee, unsecured payment fee]; each tier runs up to the next row's start. */
const BUYER_FEE_ROWS: readonly (readonly [number, number, number])[] = [
  [0, 30, 33],
  [50, 45, 50],
  [100, 70, 80],
  [200, 105, 120],
  [300, 130, 148],
  [350, 133, 155],
  [400, 145, 170],
  [450, 150, 180],
  [500, 165, 195],
  [550, 170, 200],
  [600, 190, 225],
  [700, 225, 270],
  [800, 250, 300],
  [900, 270, 325],
  [1000, 300, 365],
  [1200, 335, 405],
  [1300, 335, 410],
  [1400, 360, 440],
  [1500, 370, 460],
  [1600, 400, 495],
  [1700, 415, 520],
  [1800, 465, 580],
  [2000, 500, 635],
  [2400, 510, 655],
  [2500, 570, 745],
  [3000, 695, 905],
  [3500, 710, 955],
  [4000, 710, 990],
  [4500, 720, 990],
  [5000, 780, 1050],
  [5500, 815, 1150],
  [6000, 850, 1250],
  [6500, 880, 1300],
  [7000, 900, 1300],
  [7500, 1020, 1350],
  [8000, 1025, 1450],
  [9000, 1050, 1550],
];
/** From $10,000 the fee is a percentage of the bid: 10.5% secured, 15.5% unsecured. */
const BUYER_FEE_PERCENT_FROM = 10000;
const BUYER_FEE_BPS = { secured: 1050, unsecured: 1550 } as const;

/** [bid from, Pre-Bid fee, Live Bid fee]: the fee for a bid placed by computer, phone, tablet or terminal. */
const VIRTUAL_BID_ROWS: readonly (readonly [number, number, number])[] = [
  [0, 0, 0],
  [100, 39, 49],
  [500, 49, 59],
  [1000, 69, 79],
  [1500, 79, 89],
  [2000, 89, 99],
  [4000, 99, 109],
  [6000, 119, 139],
  [8000, 129, 149],
];

function toTiers(rows: readonly (readonly [number, number, number])[], column: 1 | 2): FeeTier[] {
  return rows.map((row, i) => ({ min: row[0], max: rows[i + 1]?.[0] ?? null, amount: row[column] }));
}

export type CopartPayment = "secured" | "unsecured";
export type CopartBidType = "live" | "pre";

export function copartCrashedToysBuyerFeeTiers(payment: CopartPayment = "secured"): FeeTier[] {
  const tiers = toTiers(BUYER_FEE_ROWS, payment === "secured" ? 1 : 2);
  tiers[tiers.length - 1]!.max = BUYER_FEE_PERCENT_FROM;
  return [...tiers, { min: BUYER_FEE_PERCENT_FROM, max: null, bps: BUYER_FEE_BPS[payment] }];
}

export function copartCrashedToysVirtualBidTiers(bid: CopartBidType = "live"): FeeTier[] {
  return toTiers(VIRTUAL_BID_ROWS, bid === "pre" ? 1 : 2);
}

export const COPART_FIXED_FEES: { label: string; amount: number }[] = [
  { label: "Gate fee", amount: 95 },
  { label: "Environmental fee", amount: 15 },
];

/** The fee tables as they go into a stored schedule (name, tiers, fixed fees, source and date). */
export function copartCrashedToysLicensedFees(payment: CopartPayment = "secured", bid: CopartBidType = "live") {
  return {
    name: `Copart CrashedToys licensed, Preferred Pricing (${payment} payment, ${bid === "live" ? "live" : "pre"} bid)`,
    buyerFeeTiers: copartCrashedToysBuyerFeeTiers(payment),
    onlineBidFeeTiers: copartCrashedToysVirtualBidTiers(bid),
    fixedFees: COPART_FIXED_FEES.map((f) => ({ ...f })),
    sourceUrl: COPART_CRASHEDTOYS_LICENSED_URL,
    verifiedAt: COPART_CRASHEDTOYS_LICENSED_VERIFIED_ON,
  } satisfies Pick<FeeSchedule, "name" | "buyerFeeTiers" | "onlineBidFeeTiers" | "fixedFees" | "sourceUrl" | "verifiedAt">;
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
