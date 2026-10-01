/** Plan catalog (isomorphic). Prices are display values; Stripe price IDs come from env. */
export type PlanId = "FREE" | "PRO" | "BUSINESS";

export interface PlanInfo {
  id: PlanId;
  name: string;
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
    features: ["3 reports per month", "Full investor report", "What-if sliders", "Manual calculator"],
  },
  PRO: {
    id: "PRO",
    name: "Pro",
    priceMonthly: 39,
    monthlyCredits: 60,
    tagline: "For active flippers",
    features: ["60 reports per month", "Batch compare (10 lots)", "PDF export & share links", "Watchlist reminders", "Deal journal & P&L"],
  },
  BUSINESS: {
    id: "BUSINESS",
    name: "Business",
    priceMonthly: 129,
    monthlyCredits: 300,
    tagline: "Dealers, shops and exporters",
    features: ["300 reports per month", "Export mode (EU landed cost)", "Browser extension", "Custom fee tables", "Priority support"],
  },
};

export const CREDIT_PACK = { credits: 10, price: 9 } as const;

export const RATE_LIMITS = {
  analysesPerHour: 30,
  batchMax: 10,
} as const;
