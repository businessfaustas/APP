import { z } from "zod";

import { errorResponse, handleApiError, json, unauthorized } from "@/lib/api";
import { getSessionUser } from "@/lib/auth/session";
import { ensureCustomer, priceFor, stripe } from "@/lib/billing/stripe";
import { env, features } from "@/lib/config/env";

const Body = z.object({ item: z.enum(["PRO", "BUSINESS", "CREDITS_10"]) });

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (!features.stripe()) return errorResponse("Billing isn't configured on this server.", 503);
  if (user.isDemo) return errorResponse("The demo account can't buy plans — sign in with your own account.", 400);
  try {
    const { item } = Body.parse(await req.json());
    const price = priceFor(item);
    if (!price) return errorResponse(`No Stripe price is configured for ${item}.`, 503);
    const customer = await ensureCustomer(user.id);
    const base = env().NEXT_PUBLIC_APP_URL;
    const session = await stripe().checkout.sessions.create({
      mode: item === "CREDITS_10" ? "payment" : "subscription",
      customer,
      client_reference_id: user.id,
      line_items: [{ price, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${base}/app/billing?status=success`,
      cancel_url: `${base}/app/billing?status=cancelled`,
      metadata: item === "CREDITS_10" ? { userId: user.id, kind: "CREDITS_10" } : { userId: user.id, plan: item },
    });
    return json({ url: session.url });
  } catch (err) {
    return handleApiError(err);
  }
}
