import { NextResponse } from "next/server";

import { ensureUser, supabaseServer } from "@/lib/auth/session";
import { features } from "@/lib/config/env";
import { legalConfig } from "@/lib/config/legal";
import { prisma } from "@/lib/db/prisma";
import { log } from "@/lib/observability/log";
import { AGE_COOKIE } from "@/lib/privacy/consent";

/**
 * Supabase magic-link / OAuth callback: exchanges the one-time code for a session.
 * An expired, reused or malformed link sends the person back to sign-in with a plain message
 * (never a raw error string), so they can request a fresh one.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const nextRaw = url.searchParams.get("next") ?? "/app";
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/app";
  const back = (reason: string) => NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(reason)}&next=${encodeURIComponent(next)}`, req.url));
  if (!features.supabaseAuth() || !code) return back("expired");

  const sb = await supabaseServer();
  const { data, error } = await sb.auth.exchangeCodeForSession(code);
  if (error || !data.user?.email) {
    log.warn("auth.callback_failed", { reason: error?.message });
    return back("expired");
  }

  // A provider-verified email is required: magic links verify it by being clicked, and Google
  // only returns verified addresses. Refuse anything else rather than trust an unverified one.
  const verified = Boolean(data.user.email_confirmed_at ?? data.user.confirmed_at);
  if (!verified) {
    await sb.auth.signOut().catch(() => undefined);
    return back("Please verify your email address first.");
  }

  const name = (data.user.user_metadata?.full_name as string | undefined) ?? null;
  await ensureUser(data.user.id, data.user.email, name);
  // If they ticked the age/terms box on the sign-in form, record it now; otherwise /welcome asks.
  if (req.headers.get("cookie")?.includes(`${AGE_COOKIE}=1`)) {
    const now = new Date();
    await prisma.user.updateMany({
      where: { id: data.user.id, ageConfirmedAt: null },
      data: { ageConfirmedAt: now, termsAcceptedAt: now, termsVersion: legalConfig().termsVersion },
    });
  }
  const res = NextResponse.redirect(new URL(next, req.url));
  res.cookies.delete(AGE_COOKIE);
  return res;
}
