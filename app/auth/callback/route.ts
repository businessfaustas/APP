import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/auth/session";
import { features } from "@/lib/config/env";

/** Supabase magic-link / OAuth callback: exchanges the code for a session. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const nextRaw = url.searchParams.get("next") ?? "/app";
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/app";
  if (!features.supabaseAuth() || !code) return NextResponse.redirect(new URL("/login?error=callback", req.url));
  const sb = await supabaseServer();
  const { error } = await sb.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, req.url));
  return NextResponse.redirect(new URL(next, req.url));
}
