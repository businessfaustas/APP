import { tiersFromRows, withPercentTail, type ReferenceFees } from "./feeTables";
import type { FeeTier } from "./types";

/**
 * IAA's buyer fee tables, as the site owner read them off IAA's fee pages (the tables there are published as
 * pictures, so these were typed in by eye). Entered 2026-11-24; IAA marks the schedules effective 2024-11-04 and the
 * fixed-fee block 2026-10-01.
 *
 * **Not verified.** The schedule is loaded with no "Verified" date and still flagged as a placeholder until a few rows
 * have been checked against IAA's own pages. Three values agree with independent third-party write-ups (a $900 sale
 * pays $320, a $2,500 sale $610, a $10,000 sale $1,000), but that is a cross-check, not a verification.
 *
 *  - Two buyer-fee schedules exist. **Standard** applies to non-licensed buyers and to licensed buyers with fewer than
 *    25 units a year; it is the default here. **High volume** is for licensed buyers with 25 or more units and
 *    $75,000 or more in sales over the past 12 months and fewer than 5 bidder accounts.
 *  - The internet bid fee is charged only when the car is won by internet bid: Proxy Bid or Live Online Bid. The
 *    default is Live Online Bid, the higher one, so a maximum bid is never overstated.
 *  - Money here is whole dollars, so the one half-dollar fee ($137.50) is rounded up.
 *  - Left out: the premium imagery set ($10, only on eligible vehicles), the EH&S and fuel surcharge (listed, but IAA
 *    shows no amount) and storage (varies by branch).
 */

export const IAA_LICENSED_URL = "https://www.iaai.com/us/Marketing/buyer-fees";
export const IAA_NON_LICENSED_URL = "https://www.iaai.com/marketing/standard-iaa-non-licensed-buyer-fees";

/** [sale price from (inclusive), buyer fee]; each tier runs up to the next row's start. */
const STANDARD_ROWS: readonly (readonly [number, number])[] = [
  [0, 25],
  [50, 45],
  [100, 80],
  [200, 130],
  [300, 138],
  [350, 145],
  [400, 175],
  [450, 185],
  [500, 205],
  [550, 210],
  [600, 240],
  [700, 270],
  [800, 295],
  [900, 320],
  [1000, 375],
  [1200, 395],
  [1300, 410],
  [1400, 430],
  [1500, 445],
  [1600, 465],
  [1700, 485],
  [1800, 510],
  [2000, 535],
  [2400, 570],
  [2500, 610],
  [3000, 655],
  [3500, 705],
  [4000, 725],
  [4500, 750],
  [5000, 775],
  [5500, 800],
  [6000, 825],
  [6500, 845],
  [7000, 880],
  [7500, 900],
  [8000, 925],
  [8500, 945],
  [10000, 1000],
];

const HIGH_VOLUME_ROWS: readonly (readonly [number, number])[] = [
  [0, 1],
  [100, 25],
  [200, 60],
  [300, 85],
  [350, 100],
  [400, 125],
  [450, 135],
  [500, 145],
  [550, 155],
  [600, 170],
  [700, 195],
  [800, 215],
  [900, 230],
  [1000, 250],
  [1200, 270],
  [1300, 285],
  [1400, 300],
  [1500, 315],
  [1600, 330],
  [1700, 350],
  [1800, 370],
  [2000, 390],
  [2400, 425],
  [2500, 460],
  [3000, 505],
  [3500, 555],
  [4000, 600],
  [4500, 625],
  [5000, 650],
  [5500, 675],
  [6000, 700],
  [6500, 720],
  [7000, 755],
  [7500, 775],
  [8000, 800],
  [8500, 820],
  [10000, 850],
  [11500, 860],
  [12000, 875],
  [12500, 890],
];

/** From $15,000 the buyer fee is a percentage of the sale price: 7.5% standard, 6.0% high volume. */
const PERCENT_FROM = 15000;
const BPS = { standard: 750, highVolume: 600 } as const;

/** [sale price from, Proxy Bid fee, Live Online Bid fee]: charged only if the car is won by internet bid. */
const INTERNET_BID_ROWS: readonly (readonly [number, number, number])[] = [
  [0, 0, 0],
  [100, 40, 50],
  [500, 55, 65],
  [1000, 75, 85],
  [1500, 85, 95],
  [2000, 100, 110],
  [4000, 110, 125],
  [6000, 125, 145],
  [8000, 140, 160],
];

export type IaaBuyerSchedule = "standard" | "highVolume";
export type IaaBidType = "live" | "proxy";

export function iaaBuyerFeeTiers(schedule: IaaBuyerSchedule = "standard"): FeeTier[] {
  return withPercentTail(tiersFromRows(schedule === "standard" ? STANDARD_ROWS : HIGH_VOLUME_ROWS, 1), PERCENT_FROM, BPS[schedule]);
}

export function iaaInternetBidTiers(bid: IaaBidType = "live"): FeeTier[] {
  return tiersFromRows(INTERNET_BID_ROWS, bid === "proxy" ? 1 : 2);
}

export const IAA_FIXED_FEES: { label: string; amount: number }[] = [
  { label: "Service fee", amount: 105 },
  { label: "Title handling", amount: 20 },
];

/** The IAA tables as they go into a stored schedule. `licensed` only picks which of IAA's pages is named as the source. */
export function iaaFees(opts: { licensed: boolean; schedule?: IaaBuyerSchedule; bid?: IaaBidType }): ReferenceFees {
  const schedule = opts.schedule ?? "standard";
  const bid = opts.bid ?? "live";
  return {
    name: `IAAI ${schedule === "standard" ? "standard" : "high-volume"} buyer fees, ${bid === "live" ? "live online" : "proxy"} bid (typed in from IAA's fee pages, unchecked)`,
    buyerFeeTiers: iaaBuyerFeeTiers(schedule),
    onlineBidFeeTiers: iaaInternetBidTiers(bid),
    fixedFees: IAA_FIXED_FEES.map((f) => ({ ...f })),
    sourceUrl: opts.licensed ? IAA_LICENSED_URL : IAA_NON_LICENSED_URL,
    verifiedAt: null,
  };
}
