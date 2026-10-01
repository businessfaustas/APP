import { NextResponse } from "next/server";

import { ensureUser } from "@/lib/auth/session";
import { DEMO_COOKIE, DEMO_USER } from "@/lib/config/demo";
import { features } from "@/lib/config/env";
import { explainDatabaseError } from "@/lib/db/errors";

function safeNext(raw: string | null): string {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/app";
}

/** Signs in as the shared demo user (when demo mode is on; see demoModeEnabled). */
export async function POST(req: Request) {
  if (!features.demoMode()) return NextResponse.json({ error: "Demo mode is disabled." }, { status: 403 });
  const form = await req.formData().catch(() => null);
  const next = safeNext((form?.get("next") as string | null) ?? new URL(req.url).searchParams.get("next"));
  try {
    await ensureUser(DEMO_USER.id, DEMO_USER.email, DEMO_USER.name, "ADMIN");
  } catch (err) {
    console.error("Demo sign-in failed", err);
    const login = new URL("/login", req.url);
    login.searchParams.set("next", next);
    login.searchParams.set("error", explainDatabaseError(err));
    return NextResponse.redirect(login, 303);
  }
  const res = NextResponse.redirect(new URL(next, req.url), 303);
  res.cookies.set(DEMO_COOKIE, "1", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30, secure: process.env.NODE_ENV === "production" });
  return res;
}
