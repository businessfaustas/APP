import { errorResponse, json } from "@/lib/api";
import { handleStripeEvent, stripe } from "@/lib/billing/stripe";
import { env } from "@/lib/config/env";
import { prisma } from "@/lib/db/prisma";
import { captureError } from "@/lib/observability/errors";

export const runtime = "nodejs";

/**
 * Stripe webhook: verifies the signature on the raw body, applies each event once (Stripe
 * retries, so the event id is recorded first), and releases the record if handling fails so the
 * retry gets another go.
 */
export async function POST(req: Request) {
  const secret = env().STRIPE_WEBHOOK_SECRET;
  if (!secret || !env().STRIPE_SECRET_KEY) return errorResponse("Billing isn't configured.", 503);
  const signature = req.headers.get("stripe-signature");
  if (!signature) return errorResponse("Missing signature", 400);
  const body = await req.text();
  let event;
  try {
    event = stripe().webhooks.constructEvent(body, signature, secret);
  } catch {
    return errorResponse("Invalid signature", 400);
  }
  try {
    await prisma.stripeEvent.create({ data: { id: event.id, type: event.type } });
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") return json({ received: true, duplicate: true });
    throw err;
  }
  try {
    await handleStripeEvent(event);
  } catch (err) {
    await prisma.stripeEvent.delete({ where: { id: event.id } }).catch(() => undefined);
    await captureError(err, { source: "webhook", path: "/api/stripe/webhook", method: "POST", extra: { eventId: event.id, type: event.type } });
    return errorResponse("Webhook handler failed", 500);
  }
  return json({ received: true });
}
