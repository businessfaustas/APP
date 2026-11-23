import type Stripe from "stripe";

type TaxOptions = Partial<Pick<Stripe.Checkout.SessionCreateParams, "automatic_tax" | "billing_address_collection" | "tax_id_collection" | "customer_update">>;

/**
 * Checkout options that make Stripe Tax calculate and collect VAT / sales tax. Off by default, because Stripe
 * rejects `automatic_tax` until the account has a head-office address and tax settings; turn it on with
 * STRIPE_AUTOMATIC_TAX=true once docs/LAUNCH-PLAN.md step 5 is done.
 *
 * - the billing address decides which country's tax applies;
 * - business buyers can enter a VAT number (reverse charge on EU B2B sales);
 * - the saved customer gets the address and name Stripe collected, so invoices and renewals use them.
 */
export function taxSessionOptions(enabled: boolean): TaxOptions {
  if (!enabled) return {};
  return {
    automatic_tax: { enabled: true },
    billing_address_collection: "required",
    tax_id_collection: { enabled: true },
    customer_update: { address: "auto", name: "auto" },
  };
}
