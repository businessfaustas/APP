import Stripe from "stripe";
import { z } from "zod";

import { errorResponse, handleApiError, json } from "@/lib/api";
import { adminFromRequest } from "@/lib/auth/admin";
import { createCatalog, ensureWebhook } from "@/lib/billing/stripeSetup";
import { features } from "@/lib/config/env";

export const runtime = "nodejs";

const Body = z.object({ action: z.enum(["create-prices", "create-webhook"]) });

/**
 * Admin-only, on a click: makes the products, prices and webhook the shop needs in the Stripe account the server's key belongs to
 * (test or live, whichever the key is). Both are safe to run again: what already exists is left alone.
 */
export async function POST(req: Request) {
  const admin = await adminFromRequest();
  if (!admin) return errorResponse("Admins only.", 403);
  if (!features.stripe()) return errorResponse("Set STRIPE_SECRET_KEY first.", 400);
  try {
    const { action } = Body.parse(await req.json());
    if (action === "create-prices") return json({ ok: true, prices: await createCatalog() });
    return json({ ok: true, webhook: await ensureWebhook() });
  } catch (err) {
    if (err instanceof Stripe.errors.StripeError) return errorResponse(`Stripe said: ${err.message}`, 502);
    if (err instanceof Error && err.message.startsWith("Stripe can only call")) return errorResponse(err.message, 400);
    return handleApiError(err);
  }
}
