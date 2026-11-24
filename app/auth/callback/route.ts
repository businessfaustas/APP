import { NextResponse } from "next/server";

import { finishSignIn, safeNext } from "@/lib/auth/complete";
import { supabaseServer } from "@/lib/auth/session";
import { features } from "@/lib/config/env";
import { log } from "@/lib/observability/log";

/**
 * Where Supabase's emails and Google send people back: confirming an email address, a password-reset link, or a
 * Google sign-in. It exchanges the one-time code for a session. An expired, reused or malformed link sends the person
 * back to sign-in with a plain message (never a raw error string), so they can try again.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));
  const back = (reason: string) => NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(reason)}&next=${encodeURIComponent(next)}`, req.url));
  if (!features.supabaseAuth() || !code) return back("expired");

  const sb = await supabaseServer();
  const { data, error } = await sb.auth.exchangeCodeForSession(code);
  if (error || !data.user?.email) {
    log.warn("auth.callback_failed", { reason: error?.message });
    return back("expired");
  }

  // A provider-verified email is required: Supabase confirms it when the link is clicked, and Google only returns
  // verified addresses. Refuse anything else rather than trust an unverified one.
  const verified = Boolean(data.user.email_confirmed_at ?? data.user.confirmed_at);
  if (!verified) {
    await sb.auth.signOut().catch(() => undefined);
    return back("Please verify your email address first.");
  }

  return finishSignIn(data.user, req, next);
}
