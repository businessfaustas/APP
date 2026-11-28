import Stripe from "stripe";
import { z } from "zod";

import { consentRequired, errorResponse, handleApiError, json, limited, unauthorized } from "@/lib/api";
import { getSessionUser } from "@/lib/auth/session";
import { isPackId } from "@/lib/billing/plans";
import { CHECKOUT_ITEMS, ensureCustomer, isMissingCustomerError, resolvePriceId, stripe } from "@/lib/billing/stripe";
import { taxSessionOptions } from "@/lib/billing/tax";
import { env, features } from "@/lib/config/env";
import { captureError } from "@/lib/observability/errors";
import { log } from "@/lib/observability/log";

const Body = z.object({ item: z.enum(CHECKOUT_ITEMS) });

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const blocked = await limited(req, "checkout", 20, 3600, user.id);
  if (blocked) return blocked;
  if (!user.consented) return consentRequired();
  if (!features.stripe()) return errorResponse("Billing isn't configured on this server.", 503);
  if (user.isDemo) return errorResponse("The demo account can't buy plans — sign in with your own account.", 400);
  try {
    const { item } = Body.parse(await req.json());
    const price = await resolvePriceId(item);
    if (!price) {
      // The owner's to-do, not the customer's: the reason goes to the logs and the admin check, the customer gets a plain message.
      log.error("stripe.price_missing", { item, hint: "Admin → Setup → Stripe → Create prices" });
      return errorResponse("This purchase isn't available yet. Please try again later.", 503);
    }
    const base = env().NEXT_PUBLIC_APP_URL;
    const pack = isPackId(item);
    const create = async (customer: string) =>
      stripe().checkout.sessions.create({
        mode: pack ? "payment" : "subscription",
        customer,
        client_reference_id: user.id,
        line_items: [{ price, quantity: 1 }],
        allow_promotion_codes: true,
        ...taxSessionOptions(env().STRIPE_AUTOMATIC_TAX),
        success_url: `${base}/app/billing?status=success`,
        cancel_url: `${base}/app/billing?status=cancelled`,
        // A pack is a one-time payment; ask Stripe for an invoice too, since business buyers need one.
        ...(pack ? { invoice_creation: { enabled: true } } : {}),
        metadata: pack ? { userId: user.id, kind: "PACK", pack: item } : { userId: user.id, plan: item },
      });
    let session;
    try {
      session = await create(await ensureCustomer(user.id));
    } catch (err) {
      // A customer id kept from the other mode (test keys before, live keys now) would fail for ever: make a new one once.
      if (!isMissingCustomerError(err)) throw err;
      session = await create(await ensureCustomer(user.id, { renew: true }));
    }
    return json({ url: session.url });
  } catch (err) {
    if (err instanceof Stripe.errors.StripeError) {
      void captureError(err, { source: "server" });
      return errorResponse("Payments are temporarily unavailable. Please try again in a few minutes.", 502);
    }
    return handleApiError(err);
  }
}
