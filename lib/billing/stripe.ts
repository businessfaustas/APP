import "server-only";

import Stripe from "stripe";

import { env } from "@/lib/config/env";
import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email/send";
import { log } from "@/lib/observability/log";
import { sendAlert } from "@/lib/observability/alert";

import { CHECKOUT_ITEMS, entryFor, entryForLookupKey, type CheckoutItem } from "./catalog";
import { isPackId, PACKS, PLANS, type PlanId } from "./plans";

export { CHECKOUT_ITEMS, type CheckoutItem };

let client: Stripe | null = null;

export function stripe(): Stripe {
  const key = env().STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe is not configured (STRIPE_SECRET_KEY).");
  if (!client) client = new Stripe(key);
  return client;
}

/** The Stripe price id set in the environment for something we sell, if any. STRIPE_PRICE_CREDITS_10 is the old name of the 10-pack price. */
export function priceFor(item: CheckoutItem): string | null {
  const e = env();
  switch (item) {
    case "PRO":
      return e.STRIPE_PRICE_PRO ?? null;
    case "BUSINESS":
      return e.STRIPE_PRICE_BUSINESS ?? null;
    case "PACK_10":
      return e.STRIPE_PRICE_PACK_10 ?? e.STRIPE_PRICE_CREDITS_10 ?? null;
    case "PACK_30":
      return e.STRIPE_PRICE_PACK_30 ?? null;
    case "PACK_100":
      return e.STRIPE_PRICE_PACK_100 ?? null;
  }
}

const priceCache = new Map<string, { id: string; at: number }>();
const PRICE_CACHE_MS = 5 * 60 * 1000;

/**
 * The Stripe price to charge for something we sell: the id from the environment when one is set, otherwise the active price
 * with our lookup key (created by Admin → Setup → Stripe → Create prices). Null when neither exists.
 */
export async function resolvePriceId(item: CheckoutItem): Promise<string | null> {
  const fromEnv = priceFor(item);
  if (fromEnv) return fromEnv;
  const { lookupKey } = entryFor(item);
  const hit = priceCache.get(lookupKey);
  if (hit && Date.now() - hit.at < PRICE_CACHE_MS) return hit.id;
  const found = await stripe().prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
  const id = found.data[0]?.id ?? null;
  if (id) priceCache.set(lookupKey, { id, at: Date.now() });
  return id;
}

/** Reports to add for a paid checkout session; null when the session isn't a credit purchase. */
export function creditsForSession(metadata: Record<string, string> | null | undefined): number | null {
  if (metadata?.kind === "PACK" && isPackId(metadata.pack)) return PACKS[metadata.pack].reports;
  if (metadata?.kind === "CREDITS_10") return 10; // sessions created before packs existed
  return null;
}

/** Which plan a subscription's price is for: by the id set in the environment, or by our lookup key. */
export function planForPrice(price: string | { id: string; lookup_key?: string | null } | null | undefined): PlanId | null {
  if (!price) return null;
  const id = typeof price === "string" ? price : price.id;
  if (id === env().STRIPE_PRICE_PRO) return "PRO";
  if (id === env().STRIPE_PRICE_BUSINESS) return "BUSINESS";
  const item = typeof price === "string" ? null : entryForLookupKey(price.lookup_key)?.item;
  return item === "PRO" || item === "BUSINESS" ? item : null;
}

/** Stripe says the customer id we kept doesn't exist: it was made in the other mode (test vs live) or has been deleted. */
export function isMissingCustomerError(err: unknown): boolean {
  const e = err as { code?: string; param?: string; message?: string } | null;
  return e?.code === "resource_missing" && (e.param === "customer" || /no such customer/i.test(e.message ?? ""));
}

/** The user's Stripe customer id, creating one if needed. `renew` replaces a stored id Stripe no longer knows. */
export async function ensureCustomer(userId: string, opts: { renew?: boolean } = {}): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.stripeCustomerId && !opts.renew) return user.stripeCustomerId;
  const customer = await stripe().customers.create({ email: user.email, name: user.name ?? undefined, metadata: { userId } });
  await prisma.user.update({ where: { id: userId }, data: { stripeCustomerId: customer.id } });
  return customer.id;
}

async function setPlan(userId: string, plan: PlanId): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;
  const allowance = PLANS[plan].monthlyCredits;
  const credits = Math.max(user.creditsRemaining, allowance);
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { plan, creditsRemaining: credits, creditsResetAt: new Date() } }),
    prisma.creditLedger.create({ data: { userId, delta: credits - user.creditsRemaining, reason: `PLAN_${plan}` } }),
  ]);
}

async function userIdForCustomer(customerId: string | null | undefined): Promise<string | null> {
  if (!customerId) return null;
  const u = await prisma.user.findUnique({ where: { stripeCustomerId: customerId }, select: { id: true } });
  return u?.id ?? null;
}

/** The few Stripe lookups the handler needs, injectable so tests don't call Stripe. */
export interface StripeDeps {
  sessionIdForPaymentIntent(paymentIntentId: string): Promise<string | null>;
  cancelCustomerSubscriptions(customerId: string): Promise<void>;
}

const liveDeps: StripeDeps = {
  sessionIdForPaymentIntent: async (pi) => (await stripe().checkout.sessions.list({ payment_intent: pi, limit: 1 })).data[0]?.id ?? null,
  cancelCustomerSubscriptions: async (customerId) => {
    const subs = await stripe().subscriptions.list({ customer: customerId, status: "all", limit: 20 });
    for (const sub of subs.data) if (sub.status !== "canceled") await stripe().subscriptions.cancel(sub.id);
  },
};

const idOf = (v: string | { id: string } | null | undefined): string | null => (typeof v === "string" ? v : (v?.id ?? null));

/** Adds the reports for a paid credit pack, once per checkout session. */
async function grantPackCredits(s: Stripe.Checkout.Session, userId: string): Promise<void> {
  const credits = s.mode === "payment" && s.payment_status === "paid" ? creditsForSession(s.metadata) : null;
  if (credits === null) return;
  const reason = `PURCHASE:${s.id}`;
  if (await prisma.creditLedger.findFirst({ where: { reason } })) return;
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { creditsRemaining: { increment: credits } } }),
    prisma.creditLedger.create({ data: { userId, delta: credits, reason } }),
  ]);
}

/**
 * Takes back the credits of a refunded or disputed pack, in proportion to the amount refunded.
 * Credits the buyer has already spent can't be recovered, so the balance never goes below zero.
 * Safe to run twice for the same refund (it only takes what is still owed).
 */
export async function clawBackPack(sessionId: string, userId: string, fraction: number, tag: string): Promise<number> {
  const purchase = await prisma.creditLedger.findFirst({ where: { userId, reason: `PURCHASE:${sessionId}` } });
  if (!purchase) return 0;
  const target = Math.round(purchase.delta * Math.min(1, Math.max(0, fraction)));
  const taken = await prisma.creditLedger.aggregate({ where: { userId, reason: { startsWith: `CLAWBACK:${sessionId}` } }, _sum: { delta: true } });
  const owed = target + (taken._sum.delta ?? 0); // ledger deltas are negative
  if (owed <= 0) return 0;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { creditsRemaining: true } });
  const take = Math.min(owed, Math.max(0, user?.creditsRemaining ?? 0));
  if (take > 0) {
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { creditsRemaining: { decrement: take } } }),
      prisma.creditLedger.create({ data: { userId, delta: -take, reason: `CLAWBACK:${sessionId}:${tag}` } }),
    ]);
  }
  if (take < owed) log.warn("stripe.clawback_shortfall", { userId, sessionId, owed, recovered: take });
  return take;
}

async function dropToFree(userId: string): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { plan: "FREE" } });
}

/** A refund or dispute on a charge: take back pack credits, or end the plan for a subscription payment. */
async function reverseCharge(
  opts: { customerId: string | null; paymentIntentId: string | null; fraction: number; tag: string; endPlanIfSubscription: boolean },
  deps: StripeDeps,
) {
  const userId = await userIdForCustomer(opts.customerId);
  if (!userId) return;
  const sessionId = opts.paymentIntentId ? await deps.sessionIdForPaymentIntent(opts.paymentIntentId) : null;
  if (sessionId && (await prisma.creditLedger.findFirst({ where: { userId, reason: `PURCHASE:${sessionId}` } }))) {
    await clawBackPack(sessionId, userId, opts.fraction, opts.tag);
    return;
  }
  // Not a credit pack, so it paid for a plan: a full refund or any dispute ends the plan.
  if (opts.endPlanIfSubscription && opts.customerId) {
    await deps.cancelCustomerSubscriptions(opts.customerId).catch((err: unknown) => log.error("stripe.cancel_subscription_failed", { err }));
    await dropToFree(userId);
  }
}

/**
 * Applies a verified Stripe webhook event (the webhook route makes sure each event id is handled
 * once). Covers purchases, plan changes, renewals, refunds, chargebacks and failed payments.
 */
export async function handleStripeEvent(event: Stripe.Event, deps: StripeDeps = liveDeps): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const s = event.data.object;
      const userId = s.client_reference_id ?? s.metadata?.userId ?? (await userIdForCustomer(idOf(s.customer)));
      if (!userId) return;
      if (s.mode === "payment") await grantPackCredits(s, userId);
      else if (s.mode === "subscription" && s.metadata?.plan) {
        const plan = s.metadata.plan as PlanId;
        if (plan in PLANS) await setPlan(userId, plan);
      }
      return;
    }
    case "checkout.session.async_payment_failed": {
      const s = event.data.object;
      await sendAlert({
        key: `stripe:async-failed:${s.id}`,
        severity: "warning",
        title: "A delayed payment failed",
        body: `Checkout session ${s.id}. No credits were granted.`,
      });
      return;
    }
    case "customer.subscription.updated":
    case "customer.subscription.created": {
      const sub = event.data.object;
      const userId = await userIdForCustomer(idOf(sub.customer));
      if (!userId) return;
      const plan = planForPrice(sub.items.data[0]?.price);
      if (plan && (sub.status === "active" || sub.status === "trialing")) await setPlan(userId, plan);
      // past_due keeps the plan while Stripe retries the card; these end it.
      if (["canceled", "unpaid", "incomplete_expired", "paused"].includes(sub.status)) await dropToFree(userId);
      return;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const userId = await userIdForCustomer(idOf(sub.customer));
      if (userId) await dropToFree(userId);
      return;
    }
    case "invoice.paid": {
      const inv = event.data.object;
      const userId = await userIdForCustomer(idOf(inv.customer));
      if (!userId) return;
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user && user.plan !== "FREE") await setPlan(userId, user.plan);
      return;
    }
    case "invoice.payment_failed": {
      const inv = event.data.object;
      const userId = await userIdForCustomer(idOf(inv.customer));
      if (!userId) return;
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
      await sendAlert({
        key: `stripe:payment-failed:${inv.id}`,
        severity: "warning",
        title: "A subscription payment failed",
        body: `Invoice ${inv.id}. Stripe will retry; the plan ends if it stays unpaid.`,
      });
      if (user) {
        await sendEmail({
          userId,
          to: user.email,
          kind: "essential",
          subject: "Your FlagBid payment didn't go through",
          text: `We couldn't charge your card for your FlagBid subscription. Stripe will try again in the next few days. To avoid losing your plan, update your payment method: ${env().NEXT_PUBLIC_APP_URL}/app/billing`,
        }).catch(() => undefined);
      }
      return;
    }
    case "charge.refunded": {
      const ch = event.data.object;
      const fraction = ch.amount > 0 ? ch.amount_refunded / ch.amount : 1;
      await reverseCharge(
        {
          customerId: idOf(ch.customer),
          paymentIntentId: idOf(ch.payment_intent),
          fraction,
          tag: `r${ch.amount_refunded}`,
          endPlanIfSubscription: fraction >= 1,
        },
        deps,
      );
      return;
    }
    case "charge.dispute.created": {
      const d = event.data.object;
      await sendAlert({
        key: `stripe:dispute:${d.id}`,
        severity: "critical",
        title: "A customer opened a payment dispute (chargeback)",
        body: `Dispute ${d.id}, ${(d.amount / 100).toFixed(2)} ${d.currency.toUpperCase()}. Submit evidence in the Stripe dashboard before the deadline.`,
      });
      const chargeId = idOf(d.charge);
      const charge = chargeId
        ? await stripe()
            .charges.retrieve(chargeId)
            .catch(() => null)
        : null;
      await reverseCharge(
        {
          customerId: idOf(charge?.customer),
          paymentIntentId: idOf(d.payment_intent) ?? idOf(charge?.payment_intent),
          fraction: 1,
          tag: `d${d.id}`,
          endPlanIfSubscription: true,
        },
        deps,
      );
      return;
    }
    default:
      return;
  }
}
