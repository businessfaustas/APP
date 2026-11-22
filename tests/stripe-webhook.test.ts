import type Stripe from "stripe";
import { afterAll, describe, expect, it } from "vitest";

import { canConnect, loadEnv, uid } from "./helpers/db";

/**
 * Money paths beyond "checkout succeeded": refunds, chargebacks, cancellations, failed payments
 * and Stripe retries. Needs a database (skipped when none is reachable).
 */
const dbUp = await canConnect();
loadEnv();
process.env.STRIPE_SECRET_KEY = "sk_test_unit";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_unit";

const ev = (type: string, object: unknown, id = uid("evt")) => ({ id, type, data: { object } }) as unknown as Stripe.Event;
const deps = (sessionId: string | null) => ({
  sessionIdForPaymentIntent: async () => sessionId,
  cancelCustomerSubscriptions: async () => undefined,
});

describe.skipIf(!dbUp)("Stripe webhook handling", () => {
  const created: string[] = [];
  async function makeUser(over: Record<string, unknown> = {}) {
    const { prisma } = await import("@/lib/db/prisma");
    const id = uid("stripe");
    created.push(id);
    await prisma.user.create({ data: { id, email: `${id}@example.test`, stripeCustomerId: `cus_${id}`, creditsRemaining: 3, ...over } });
    return { id, customer: `cus_${id}`, prisma };
  }
  afterAll(async () => {
    const { prisma } = await import("@/lib/db/prisma");
    await prisma.user.deleteMany({ where: { id: { in: created } } });
    await prisma.stripeEvent.deleteMany({ where: { id: { startsWith: "evt_test_dup" } } });
  });

  const pack = (u: { id: string; customer: string }, sid: string) =>
    ev("checkout.session.completed", {
      id: sid,
      mode: "payment",
      payment_status: "paid",
      client_reference_id: u.id,
      customer: u.customer,
      metadata: { kind: "PACK", pack: "PACK_10", userId: u.id },
    });

  it("grants a pack once even if the same session is delivered twice", async () => {
    const { handleStripeEvent } = await import("@/lib/billing/stripe");
    const u = await makeUser();
    await handleStripeEvent(pack(u, "cs_1"), deps(null));
    await handleStripeEvent(pack(u, "cs_1"), deps(null));
    expect((await u.prisma.user.findUnique({ where: { id: u.id } }))?.creditsRemaining).toBe(13);
  });

  it("takes the credits back on a full refund, and only once", async () => {
    const { handleStripeEvent } = await import("@/lib/billing/stripe");
    const u = await makeUser();
    await handleStripeEvent(pack(u, "cs_2"), deps(null));
    const refund = ev("charge.refunded", { id: "ch_1", customer: u.customer, payment_intent: "pi_1", amount: 2900, amount_refunded: 2900 });
    await handleStripeEvent(refund, deps("cs_2"));
    await handleStripeEvent(refund, deps("cs_2"));
    expect((await u.prisma.user.findUnique({ where: { id: u.id } }))?.creditsRemaining).toBe(3);
  });

  it("takes back a proportional share on a partial refund, then the rest on a later one", async () => {
    const { handleStripeEvent } = await import("@/lib/billing/stripe");
    const u = await makeUser();
    await handleStripeEvent(pack(u, "cs_3"), deps(null));
    await handleStripeEvent(
      ev("charge.refunded", { id: "ch_2", customer: u.customer, payment_intent: "pi_2", amount: 2900, amount_refunded: 1450 }),
      deps("cs_3"),
    );
    expect((await u.prisma.user.findUnique({ where: { id: u.id } }))?.creditsRemaining).toBe(8);
    await handleStripeEvent(
      ev("charge.refunded", { id: "ch_2", customer: u.customer, payment_intent: "pi_2", amount: 2900, amount_refunded: 2900 }),
      deps("cs_3"),
    );
    expect((await u.prisma.user.findUnique({ where: { id: u.id } }))?.creditsRemaining).toBe(3);
  });

  it("never drives the balance below zero when the credits were already used", async () => {
    const { handleStripeEvent } = await import("@/lib/billing/stripe");
    const u = await makeUser();
    await handleStripeEvent(pack(u, "cs_4"), deps(null));
    await u.prisma.user.update({ where: { id: u.id }, data: { creditsRemaining: 2 } }); // spent 11 of 13
    await handleStripeEvent(
      ev("charge.refunded", { id: "ch_3", customer: u.customer, payment_intent: "pi_3", amount: 2900, amount_refunded: 2900 }),
      deps("cs_4"),
    );
    expect((await u.prisma.user.findUnique({ where: { id: u.id } }))?.creditsRemaining).toBe(0);
  });

  it("a fully refunded subscription payment ends the plan", async () => {
    const { handleStripeEvent } = await import("@/lib/billing/stripe");
    const u = await makeUser({ plan: "PRO" });
    await handleStripeEvent(
      ev("charge.refunded", { id: "ch_4", customer: u.customer, payment_intent: "pi_4", amount: 5900, amount_refunded: 5900 }),
      deps(null),
    );
    expect((await u.prisma.user.findUnique({ where: { id: u.id } }))?.plan).toBe("FREE");
  });

  it("a subscription that is cancelled or goes unpaid drops to Free; past_due keeps the plan", async () => {
    const { handleStripeEvent } = await import("@/lib/billing/stripe");
    const u = await makeUser({ plan: "PRO" });
    const sub = (status: string) => ev("customer.subscription.updated", { customer: u.customer, status, items: { data: [{ price: { id: "price_x" } }] } });
    await handleStripeEvent(sub("past_due"), deps(null));
    expect((await u.prisma.user.findUnique({ where: { id: u.id } }))?.plan).toBe("PRO");
    await handleStripeEvent(sub("unpaid"), deps(null));
    expect((await u.prisma.user.findUnique({ where: { id: u.id } }))?.plan).toBe("FREE");
    await u.prisma.user.update({ where: { id: u.id }, data: { plan: "BUSINESS" } });
    await handleStripeEvent(ev("customer.subscription.deleted", { customer: u.customer }), deps(null));
    expect((await u.prisma.user.findUnique({ where: { id: u.id } }))?.plan).toBe("FREE");
  });

  it("the route applies each Stripe event once and rejects forged signatures", async () => {
    const Stripe = (await import("stripe")).default;
    const { POST } = await import("@/app/api/stripe/webhook/route");
    const u = await makeUser();
    const payload = JSON.stringify({
      id: "evt_test_dup_1",
      object: "event",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_dup",
          mode: "payment",
          payment_status: "paid",
          client_reference_id: u.id,
          customer: u.customer,
          metadata: { kind: "PACK", pack: "PACK_10" },
        },
      },
    });
    const header = new Stripe("sk_test_unit").webhooks.generateTestHeaderString({ payload, secret: "whsec_unit" });
    const send = (sig: string) =>
      POST(new Request("http://localhost/api/stripe/webhook", { method: "POST", headers: { "stripe-signature": sig }, body: payload }));
    expect((await send("t=1,v1=bad")).status).toBe(400);
    expect((await send(header)).status).toBe(200);
    const again = await send(header);
    expect(((await again.json()) as { duplicate?: boolean }).duplicate).toBe(true);
    expect((await u.prisma.user.findUnique({ where: { id: u.id } }))?.creditsRemaining).toBe(13);
  });
});
