import { errorResponse, handleApiError, json, limited, unauthorized } from "@/lib/api";
import { getSessionUser } from "@/lib/auth/session";
import { ensureCustomer, stripe } from "@/lib/billing/stripe";
import { env, features } from "@/lib/config/env";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const blocked = await limited(req, "portal", 20, 3600, user.id);
  if (blocked) return blocked;
  if (!features.stripe()) return errorResponse("Billing isn't configured on this server.", 503);
  try {
    const customer = await ensureCustomer(user.id);
    const session = await stripe().billingPortal.sessions.create({ customer, return_url: `${env().NEXT_PUBLIC_APP_URL}/app/billing` });
    return json({ url: session.url });
  } catch (err) {
    return handleApiError(err);
  }
}
