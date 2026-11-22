import "server-only";

import { createClient } from "@supabase/supabase-js";

import { stripe } from "@/lib/billing/stripe";
import { env, features } from "@/lib/config/env";
import { prisma } from "@/lib/db/prisma";
import { log } from "@/lib/observability/log";
import { sendAlert } from "@/lib/observability/alert";
import { removePrefix } from "@/lib/storage/photos";

/**
 * Erases an account and everything attached to it:
 *  1. the Stripe subscription is cancelled and the customer record deleted, so nobody is billed
 *     for an account that no longer exists (if Stripe can't be reached we stop and keep the account),
 *  2. the uploaded photos are removed from storage,
 *  3. the user row is deleted, and the database cascades to settings, analyses, batches,
 *     watchlist, journal and credit history,
 *  4. the sign-in identity is deleted from Supabase Auth, so the same email starts from scratch.
 * Invoices stay with Stripe: tax law requires the operator to keep them.
 */
export async function deleteAccount(user: { id: string; stripeCustomerId?: string | null }): Promise<void> {
  const row = await prisma.user.findUnique({ where: { id: user.id }, select: { stripeCustomerId: true } });
  const customerId = row?.stripeCustomerId ?? user.stripeCustomerId ?? null;

  if (customerId && features.stripe()) {
    const subs = await stripe().subscriptions.list({ customer: customerId, status: "all", limit: 20 });
    for (const sub of subs.data) if (sub.status !== "canceled") await stripe().subscriptions.cancel(sub.id);
    await stripe().customers.del(customerId);
  }

  await removePrefix(`uploads/${user.id.replace(/[^\w-]/g, "")}`).catch((err: unknown) => log.warn("account.delete_files_failed", { err }));
  await prisma.user.delete({ where: { id: user.id } });

  if (features.supabaseStorage()) {
    try {
      const admin = createClient(env().NEXT_PUBLIC_SUPABASE_URL!, env().SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
      const { error } = await admin.auth.admin.deleteUser(user.id);
      if (error) throw error;
    } catch (err) {
      log.error("account.delete_auth_identity_failed", { err });
      await sendAlert({
        key: `account-delete-auth:${user.id}`,
        severity: "warning",
        title: "Account deleted but its Supabase sign-in identity remains",
        body: `User id ${user.id}. Delete it in Supabase → Authentication → Users.`,
      });
    }
  }
}
