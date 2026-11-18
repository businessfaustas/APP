/**
 * What BidPilot sells (isomorphic). Prices are display values in whole euros; the amount actually
 * charged is the Stripe price, so create the Stripe prices in EUR with the same numbers.
 * The reasoning behind the numbers is in DECISIONS.md ("Pricing").
 */
export type PlanId = "FREE" | "PRO" | "BUSINESS";

export interface PlanInfo {
  id: PlanId;
  name: string;
  /** Whole euros per month. */
  priceMonthly: number;
  monthlyCredits: number;
  tagline: string;
  features: string[];
}

export const PLANS: Record<PlanId, PlanInfo> = {
  FREE: {
    id: "FREE",
    name: "Free",
    priceMonthly: 0,
    monthlyCredits: 3,
    tagline: "Try it on your next lot",
    features: ["No card needed", "Full investor report", "What-if sliders", "Manual calculator"],
  },
  PRO: {
    id: "PRO",
    name: "Pro",
    priceMonthly: 59,
    monthlyCredits: 40,
    tagline: "For active flippers",
    features: ["Cancel any time", "Batch compare (10 lots)", "PDF export & share links", "Watchlist reminders", "Deal journal & P&L"],
  },
  BUSINESS: {
    id: "BUSINESS",
    name: "Business",
    priceMonthly: 149,
    monthlyCredits: 120,
    tagline: "Dealers, shops and exporters",
    features: ["Cancel any time", "Export mode (EU landed cost)", "Browser extension", "Custom fee tables", "Priority support"],
  },
};

/** One-time packs of reports ("cars"). Credits from a pack never expire and are not reset by a plan. */
export type PackId = "PACK_10" | "PACK_30" | "PACK_100";

export interface PackInfo {
  id: PackId;
  reports: number;
  /** Whole euros, once. */
  price: number;
}

export const PACKS: Record<PackId, PackInfo> = {
  PACK_10: { id: "PACK_10", reports: 10, price: 29 },
  PACK_30: { id: "PACK_30", reports: 30, price: 75 },
  PACK_100: { id: "PACK_100", reports: 100, price: 199 },
};
export const PACK_ORDER: PackId[] = ["PACK_10", "PACK_30", "PACK_100"];
/** The pack shown as the default choice. */
export const FEATURED_PACK: PackId = "PACK_30";

export function isPackId(v: unknown): v is PackId {
  return typeof v === "string" && v in PACKS;
}

/** Euros per report in a pack (not rounded: €2.90, €2.50, €1.99). */
export function pricePerReport(pack: PackInfo): number {
  return pack.price / pack.reports;
}

export const RATE_LIMITS = {
  analysesPerHour: 30,
  batchMax: 10,
} as const;
