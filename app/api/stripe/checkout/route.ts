import { z } from "zod";

import { consentRequired, errorResponse, handleApiError, json, limited, unauthorized } from "@/lib/api";
import { getSessionUser } from "@/lib/auth/session";
import { isPackId } from "@/lib/billing/plans";
import { CHECKOUT_ITEMS, ensureCustomer, priceFor, stripe } from "@/lib/billing/stripe";
import { env, features } from "@/lib/config/env";

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
    const price = priceFor(item);
    if (!price) return errorResponse(`No Stripe price is configured for ${item}.`, 503);
    const customer = await ensureCustomer(user.id);
    const base = env().NEXT_PUBLIC_APP_URL;
    const pack = isPackId(item);
    const session = await stripe().checkout.sessions.create({
      mode: pack ? "payment" : "subscription",
      customer,
      client_reference_id: user.id,
      line_items: [{ price, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${base}/app/billing?status=success`,
      cancel_url: `${base}/app/billing?status=cancelled`,
      // A pack is a one-time payment; ask Stripe for an invoice too, since business buyers need one.
      ...(pack ? { invoice_creation: { enabled: true } } : {}),
      metadata: pack ? { userId: user.id, kind: "PACK", pack: item } : { userId: user.id, plan: item },
    });
    return json({ url: session.url });
  } catch (err) {
    return handleApiError(err);
  }
}
