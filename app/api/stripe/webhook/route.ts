import { errorResponse, json } from "@/lib/api";
import { handleStripeEvent, stripe } from "@/lib/billing/stripe";
import { env } from "@/lib/config/env";

export const runtime = "nodejs";

/** Stripe webhook: verifies the signature on the raw body, then applies the event. */
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
    await handleStripeEvent(event);
  } catch (err) {
    console.error("Stripe webhook handling failed", err);
    return errorResponse("Webhook handler failed", 500);
  }
  return json({ received: true });
}
