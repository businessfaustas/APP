import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/auth/session";
import { DEMO_COOKIE } from "@/lib/config/demo";
import { features } from "@/lib/config/env";

export async function POST(req: Request) {
  if (features.supabaseAuth()) {
    const sb = await supabaseServer();
    await sb.auth.signOut().catch(() => undefined);
  }
  const res = NextResponse.redirect(new URL("/", req.url), 303);
  res.cookies.delete(DEMO_COOKIE);
  return res;
}
