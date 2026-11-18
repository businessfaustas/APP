import "server-only";

import Stripe from "stripe";

import { env } from "@/lib/config/env";
import { prisma } from "@/lib/db/prisma";

import { isPackId, PACKS, PLANS, type PackId, type PlanId } from "./plans";

let client: Stripe | null = null;

export function stripe(): Stripe {
  const key = env().STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe is not configured (STRIPE_SECRET_KEY).");
  if (!client) client = new Stripe(key);
  return client;
}

export type CheckoutItem = "PRO" | "BUSINESS" | PackId;
export const CHECKOUT_ITEMS = ["PRO", "BUSINESS", "PACK_10", "PACK_30", "PACK_100"] as const;

/** The Stripe price for something we sell. STRIPE_PRICE_CREDITS_10 is the old name of the 10-pack price. */
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

/** Reports to add for a paid checkout session; null when the session isn't a credit purchase. */
export function creditsForSession(metadata: Record<string, string> | null | undefined): number | null {
  if (metadata?.kind === "PACK" && isPackId(metadata.pack)) return PACKS[metadata.pack].reports;
  if (metadata?.kind === "CREDITS_10") return 10; // sessions created before packs existed
  return null;
}

export function planForPrice(priceId: string | null | undefined): PlanId | null {
  if (!priceId) return null;
  if (priceId === env().STRIPE_PRICE_PRO) return "PRO";
  if (priceId === env().STRIPE_PRICE_BUSINESS) return "BUSINESS";
  return null;
}

export async function ensureCustomer(userId: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.stripeCustomerId) return user.stripeCustomerId;
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

/** Applies a verified Stripe webhook event. Idempotent enough for retries (credit packs keyed by session). */
export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object;
      const userId = s.client_reference_id ?? s.metadata?.userId ?? (await userIdForCustomer(typeof s.customer === "string" ? s.customer : s.customer?.id));
      if (!userId) return;
      const credits = s.mode === "payment" && s.payment_status === "paid" ? creditsForSession(s.metadata) : null;
      if (credits !== null) {
        const reason = `PURCHASE:${s.id}`;
        const already = await prisma.creditLedger.findFirst({ where: { reason } });
        if (already) return;
        await prisma.$transaction([
          prisma.user.update({ where: { id: userId }, data: { creditsRemaining: { increment: credits } } }),
          prisma.creditLedger.create({ data: { userId, delta: credits, reason } }),
        ]);
      } else if (s.mode === "subscription" && s.metadata?.plan) {
        const plan = s.metadata.plan as PlanId;
        if (plan in PLANS) await setPlan(userId, plan);
      }
      return;
    }
    case "customer.subscription.updated":
    case "customer.subscription.created": {
      const sub = event.data.object;
      const userId = await userIdForCustomer(typeof sub.customer === "string" ? sub.customer : sub.customer.id);
      if (!userId) return;
      const plan = planForPrice(sub.items.data[0]?.price.id);
      if (plan && (sub.status === "active" || sub.status === "trialing")) await setPlan(userId, plan);
      if (sub.status === "canceled" || sub.status === "unpaid") await prisma.user.update({ where: { id: userId }, data: { plan: "FREE" } });
      return;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const userId = await userIdForCustomer(typeof sub.customer === "string" ? sub.customer : sub.customer.id);
      if (userId) await prisma.user.update({ where: { id: userId }, data: { plan: "FREE" } });
      return;
    }
    case "invoice.paid": {
      const inv = event.data.object;
      const userId = await userIdForCustomer(typeof inv.customer === "string" ? inv.customer : inv.customer?.id);
      if (!userId) return;
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user && user.plan !== "FREE") await setPlan(userId, user.plan);
      return;
    }
    default:
      return;
  }
}
