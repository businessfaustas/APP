import { NextResponse } from "next/server";

import { finishSignIn, safeNext } from "@/lib/auth/complete";
import { supabaseServer } from "@/lib/auth/session";
import { features } from "@/lib/config/env";

/**
 * Where the browser goes right after a password sign-in (or a sign-up that needed no email confirmation). The
 * Supabase session cookie is already set by then, so there is no code to exchange: read who it is, make sure the
 * app has a row for them, and carry on to the page they wanted.
 */
export async function GET(req: Request) {
  const next = safeNext(new URL(req.url).searchParams.get("next"));
  const signIn = (reason: string) => NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(reason)}&next=${encodeURIComponent(next)}`, req.url));
  if (!features.supabaseAuth()) return signIn("expired");

  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  const user = data.user;
  if (!user?.email) return signIn("expired");
  if (!(user.email_confirmed_at ?? user.confirmed_at)) {
    await sb.auth.signOut().catch(() => undefined);
    return signIn("unconfirmed");
  }
  return finishSignIn(user, req, next);
}
