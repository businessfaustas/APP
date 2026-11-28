import "server-only";

import type Stripe from "stripe";

import { env } from "@/lib/config/env";

import { CATALOG, entryForLookupKey, REQUIRED_WEBHOOK_EVENTS, WEBHOOK_PATH, type CatalogEntry } from "./catalog";
import { stripe } from "./stripe";

/**
 * Sets up Stripe's side of the shop from the catalog, and checks it. Everything here runs only from the admin pages, and only
 * on a click: the app never changes anything in Stripe on its own.
 */

export interface PriceResult {
  item: CatalogEntry["item"];
  name: string;
  priceId: string;
  status: "created" | "exists" | "mismatch";
  /** For a mismatch: what is wrong with the price that already has this lookup key. */
  note?: string;
}

function mismatch(entry: CatalogEntry, p: Stripe.Price): string | null {
  const wrong: string[] = [];
  if (p.currency !== "eur") wrong.push(`currency is ${p.currency.toUpperCase()}, not EUR`);
  if (p.unit_amount !== entry.amountCents) wrong.push(`amount is ${((p.unit_amount ?? 0) / 100).toFixed(2)}, not ${(entry.amountCents / 100).toFixed(2)}`);
  if (entry.recurring && p.recurring?.interval !== "month") wrong.push("it is not a monthly subscription price");
  if (!entry.recurring && p.type !== "one_time") wrong.push("it is not a one-time price");
  return wrong.length ? `This price ${wrong.join(" and ")}. Archive it in Stripe (Product catalogue), then create the prices again.` : null;
}

/** Creates the five products and prices, skipping any that already exist. Safe to run again. */
export async function createCatalog(client: Stripe = stripe()): Promise<PriceResult[]> {
  const out: PriceResult[] = [];
  for (const entry of CATALOG) {
    const found = await client.prices.list({ lookup_keys: [entry.lookupKey], active: true, limit: 1 });
    const existing = found.data[0];
    if (existing) {
      const bad = mismatch(entry, existing);
      out.push({ item: entry.item, name: entry.name, priceId: existing.id, status: bad ? "mismatch" : "exists", ...(bad ? { note: bad } : {}) });
      continue;
    }
    const product = await client.products.create({
      name: entry.name,
      description: entry.description,
      marketing_features: entry.features.map((name) => ({ name })),
      metadata: { flagbid_item: entry.item, reports: String(entry.reports) },
    });
    const price = await client.prices.create({
      product: product.id,
      currency: "eur",
      unit_amount: entry.amountCents,
      lookup_key: entry.lookupKey,
      nickname: entry.name,
      // The price on the card is the price the customer pays; Stripe works the VAT out of it.
      tax_behavior: "inclusive",
      ...(entry.recurring ? { recurring: { interval: "month" as const } } : {}),
      metadata: { flagbid_item: entry.item },
    });
    out.push({ item: entry.item, name: entry.name, priceId: price.id, status: "created" });
  }
  return out;
}

export interface WebhookResult {
  url: string;
  id: string;
  created: boolean;
  /** Only present right after creation: Stripe never shows it again through the API. */
  secret: string | null;
  /** Events that were missing from an existing endpoint and have now been added. */
  addedEvents: string[];
}

export function webhookUrl(): string {
  return `${env().NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}${WEBHOOK_PATH}`;
}

type EventName = Stripe.WebhookEndpointCreateParams.EnabledEvent;

/** Creates the webhook endpoint (or completes an existing one) so Stripe tells the app about payments. */
export async function ensureWebhook(client: Stripe = stripe(), url: string = webhookUrl()): Promise<WebhookResult> {
  if (!url.startsWith("https://") || /\/\/(localhost|127\.|0\.0\.0\.0)/.test(url)) {
    throw new Error(`Stripe can only call a public https address, and this server's address is ${url}. Set NEXT_PUBLIC_APP_URL to your live site.`);
  }
  const list = await client.webhookEndpoints.list({ limit: 100 });
  const existing = list.data.find((e) => e.url === url);
  if (existing) {
    const have = new Set(existing.enabled_events);
    const missing = have.has("*") ? [] : REQUIRED_WEBHOOK_EVENTS.filter((e) => !have.has(e));
    if (missing.length > 0 || existing.status !== "enabled") {
      await client.webhookEndpoints.update(existing.id, {
        enabled_events: [...existing.enabled_events, ...missing] as EventName[],
        disabled: false,
      });
    }
    return { url, id: existing.id, created: false, secret: null, addedEvents: [...missing] };
  }
  const made = await client.webhookEndpoints.create({
    url,
    enabled_events: [...REQUIRED_WEBHOOK_EVENTS] as EventName[],
    description: "FlagBid payments: credits, plans, refunds and disputes",
  });
  return { url, id: made.id, created: true, secret: made.secret ?? null, addedEvents: [] };
}

export interface StripeCheck {
  ok: boolean;
  /** One plain sentence per finding, problems first. */
  lines: string[];
}

/** Reads (never writes) the Stripe account: key mode, the five prices, the webhook, tax and the customer portal. */
export async function diagnoseStripe(
  client: Stripe = stripe(),
  opts: { key?: string; webhookSecretSet?: boolean; automaticTax?: boolean; url?: string } = {},
): Promise<StripeCheck> {
  const problems: string[] = [];
  const good: string[] = [];
  const mode =
    opts.key?.startsWith("sk_live_") || opts.key?.startsWith("rk_live_")
      ? "live"
      : opts.key?.startsWith("sk_test_") || opts.key?.startsWith("rk_test_")
        ? "test"
        : null;
  good.push(mode ? `Key accepted (${mode} mode).` : "Key accepted.");

  // Prices: the id from the environment wins, else the lookup key. Either way it must be right for what we sell.
  const missingItems: string[] = [];
  for (const entry of CATALOG) {
    const found = await client.prices.list({ lookup_keys: [entry.lookupKey], active: true, limit: 1 });
    const price = found.data[0];
    if (!price) {
      missingItems.push(entry.name);
      continue;
    }
    const bad = mismatch(entry, price);
    if (bad) problems.push(`${entry.name}: ${bad}`);
    else if (price.tax_behavior === "exclusive")
      problems.push(`${entry.name}: tax behaviour is "exclusive", so VAT would be added on top of the price. Create it as "inclusive".`);
  }
  if (missingItems.length === CATALOG.length)
    problems.push(`None of the ${CATALOG.length} prices exist in this ${mode ?? "Stripe"} account yet: press "Create prices".`);
  else if (missingItems.length > 0) problems.push(`Missing prices: ${missingItems.join(", ")}. Press "Create prices".`);
  else if (!problems.some((p) => p.includes(":"))) good.push(`All ${CATALOG.length} prices exist with the right amounts.`);

  // Webhook: without it a payment succeeds but the customer gets no credits.
  const url = opts.url ?? webhookUrl();
  try {
    const hooks = await client.webhookEndpoints.list({ limit: 100 });
    const hook = hooks.data.find((e) => e.url === url);
    if (!hook) problems.push(`No webhook points at ${url}: customers would pay and get no credits. Press "Create webhook".`);
    else {
      const have = new Set(hook.enabled_events);
      const missing = have.has("*") ? [] : REQUIRED_WEBHOOK_EVENTS.filter((e) => !have.has(e));
      if (hook.status !== "enabled") problems.push("The webhook endpoint is disabled in Stripe.");
      else if (missing.length > 0) problems.push(`The webhook is missing events: ${missing.join(", ")}. Press "Create webhook" to complete it.`);
      else good.push("The webhook endpoint is set up with every event.");
    }
  } catch {
    problems.push("Couldn't read the webhook endpoints (the key may not be allowed to).");
  }
  if (!opts.webhookSecretSet)
    problems.push("STRIPE_WEBHOOK_SECRET is not set in Vercel, so the app rejects every webhook from Stripe. Add the signing secret and redeploy.");

  if (opts.automaticTax) {
    try {
      const tax = await client.tax.settings.retrieve();
      if (tax.status !== "active")
        problems.push(
          "STRIPE_AUTOMATIC_TAX is on, but Stripe Tax isn't active yet: finish Stripe → Settings → Tax (head-office address), or turn the variable off.",
        );
      else good.push("Stripe Tax is active.");
    } catch {
      problems.push("STRIPE_AUTOMATIC_TAX is on, but Stripe Tax settings couldn't be read.");
    }
  }
  try {
    const portal = await client.billingPortal.configurations.list({ limit: 1, is_default: true });
    if (portal.data.length === 0)
      problems.push(
        "The customer portal isn't set up: Stripe → Settings → Billing → Customer portal → Save (customers can't cancel or update cards until then).",
      );
    else good.push("The customer portal is set up.");
  } catch {
    // an older or restricted key: not worth failing the check
  }
  void entryForLookupKey;
  return { ok: problems.length === 0, lines: [...problems, ...good] };
}
