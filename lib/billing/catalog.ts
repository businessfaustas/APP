/**
 * What FlagBid sells, as it must exist in Stripe (isomorphic, no I/O). Each product has a price with a fixed "lookup key", so
 * the app finds its prices in Stripe by name and needs no price ids pasted into the hosting settings. A STRIPE_PRICE_* variable,
 * if set, still wins (it lets you point a product at a different price). Amounts come from plans.ts so the two cannot drift.
 */
import { PACKS, PLANS, type PackId } from "./plans";

export type CheckoutItem = "PRO" | "BUSINESS" | PackId;
export const CHECKOUT_ITEMS = ["PRO", "BUSINESS", "PACK_10", "PACK_30", "PACK_100"] as const;

export interface CatalogEntry {
  item: CheckoutItem;
  lookupKey: string;
  /** The product name customers see on Stripe checkout and invoices. */
  name: string;
  /** Euro cents. */
  amountCents: number;
  /** A monthly subscription (true) or a one-time pack (false). */
  recurring: boolean;
  /** One or two sentences on what the customer gets, shown on Stripe's checkout page and invoices. */
  description: string;
  /** What the customer gets, as short bullet points (Stripe shows them on the checkout page). */
  features: string[];
  /** The reports the purchase adds: once for a pack, every month for a plan. */
  reports: number;
}

export const CATALOG: readonly CatalogEntry[] = [
  ...(["PACK_10", "PACK_30", "PACK_100"] as const).map((item) => ({
    item,
    lookupKey: `flagbid_${item.toLowerCase()}`,
    name: `FlagBid: ${PACKS[item].reports} cars`,
    amountCents: PACKS[item].price * 100,
    recurring: false,
    reports: PACKS[item].reports,
    description: `One payment for ${PACKS[item].reports} car reports. Each report is a full analysis of one auction lot: verdict, max bid, repair estimate and profit. The reports never expire.`,
    features: [`${PACKS[item].reports} full car reports`, "Reports never expire", "Invoice included", "No subscription"],
  })),
  planEntry("PRO", "flagbid_pro_monthly"),
  planEntry("BUSINESS", "flagbid_business_monthly"),
];

function planEntry(item: "PRO" | "BUSINESS", lookupKey: string): CatalogEntry {
  const plan = PLANS[item];
  return {
    item,
    lookupKey,
    name: `FlagBid ${plan.name}`,
    amountCents: plan.priceMonthly * 100,
    recurring: true,
    reports: plan.monthlyCredits,
    description: `${plan.name} plan, billed monthly: ${plan.monthlyCredits} car reports every month. ${plan.tagline}. Cancel any time.`,
    features: [`${plan.monthlyCredits} car reports every month`, ...plan.features],
  };
}

export const entryFor = (item: CheckoutItem): CatalogEntry => CATALOG.find((c) => c.item === item)!;
export const entryForLookupKey = (key: string | null | undefined): CatalogEntry | null => CATALOG.find((c) => c.lookupKey === key) ?? null;

/** The Stripe events the webhook must receive (see app/api/stripe/webhook and lib/billing/stripe.ts handleStripeEvent). */
export const REQUIRED_WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
  "charge.refunded",
  "charge.dispute.created",
] as const;

export const WEBHOOK_PATH = "/api/stripe/webhook";
