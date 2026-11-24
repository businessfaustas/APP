import "server-only";

import type { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { ensureUser } from "@/lib/auth/session";
import { consentFromMetadata, profileFromMetadata } from "@/lib/auth/signup";
import { legalConfig } from "@/lib/config/legal";
import { prisma } from "@/lib/db/prisma";
import { AGE_COOKIE } from "@/lib/privacy/consent";

/** Only ever send people to a path on this site, whatever a link or form says. */
export function safeNext(raw: string | null | undefined, fallback = "/app"): string {
  return raw && raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\") ? raw : fallback;
}

/**
 * The last step of every way in (email confirmation, password reset, password sign-in, Google): they now have a
 * Supabase session, so make sure the app's own user row exists (with the name and phone they gave), record the
 * 18+/terms tick if they gave it, and send them on. The caller has already checked the email is verified.
 */
export async function finishSignIn(user: User, req: Request, next: string): Promise<NextResponse> {
  const { name, phone } = profileFromMetadata(user.user_metadata);
  await ensureUser(user.id, user.email!, name, undefined, phone);
  const tickedAt = consentFromMetadata(user.user_metadata) ?? (req.headers.get("cookie")?.includes(`${AGE_COOKIE}=1`) ? new Date() : null);
  if (tickedAt) {
    await prisma.user.updateMany({
      where: { id: user.id, ageConfirmedAt: null },
      data: { ageConfirmedAt: tickedAt, termsAcceptedAt: tickedAt, termsVersion: legalConfig().termsVersion },
    });
  }
  const res = NextResponse.redirect(new URL(next, req.url));
  res.cookies.delete(AGE_COOKIE);
  return res;
}
