import "server-only";

import { createHash } from "node:crypto";

import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { ensureMonthlyCredits } from "@/lib/billing/credits";
import { DEMO_COOKIE, DEMO_USER } from "@/lib/config/demo";
import { env, features } from "@/lib/config/env";
import { prisma } from "@/lib/db/prisma";

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  role: "USER" | "ADMIN";
  plan: "FREE" | "PRO" | "BUSINESS";
  creditsRemaining: number;
  isDemo: boolean;
}

export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(env().NEXT_PUBLIC_SUPABASE_URL!, env().NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (toSet) => {
        try {
          for (const c of toSet) store.set(c.name, c.value, c.options);
        } catch {
          // called from a Server Component — the proxy refreshes the session instead
        }
      },
    },
  });
}

function isAdminEmail(email: string): boolean {
  return (env().ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}

/** Creates the app user (with default settings) on first sign-in. */
export async function ensureUser(id: string, email: string, name: string | null, role?: "USER" | "ADMIN"): Promise<void> {
  const existing = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (existing) {
    if (role === "ADMIN" && existing.role !== "ADMIN") await prisma.user.update({ where: { id }, data: { role } });
    return;
  }
  await prisma.user.create({
    data: {
      id,
      email,
      name,
      role: role ?? "USER",
      creditsRemaining: id === DEMO_USER.id ? 500 : 3,
      plan: id === DEMO_USER.id ? "PRO" : "FREE",
      creditsResetAt: new Date(),
      settings: { create: {} },
      ledger: { create: { delta: id === DEMO_USER.id ? 500 : 3, reason: "SIGNUP" } },
    },
  });
}

async function loadSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  let identity: { id: string; email: string; name: string | null; isDemo: boolean } | null = null;

  if (features.demoMode() && store.get(DEMO_COOKIE)?.value === "1") {
    identity = { id: DEMO_USER.id, email: DEMO_USER.email, name: DEMO_USER.name, isDemo: true };
    await ensureUser(DEMO_USER.id, DEMO_USER.email, DEMO_USER.name, "ADMIN");
  } else if (features.supabaseAuth()) {
    const sb = await supabaseServer();
    const { data } = await sb.auth.getUser();
    if (data.user?.email) {
      const name = (data.user.user_metadata?.full_name as string | undefined) ?? null;
      identity = { id: data.user.id, email: data.user.email, name, isDemo: false };
      await ensureUser(data.user.id, data.user.email, name, isAdminEmail(data.user.email) ? "ADMIN" : undefined);
    }
  }
  if (!identity) return null;

  await ensureMonthlyCredits(identity.id);
  const user = await prisma.user.findUnique({ where: { id: identity.id } });
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    plan: user.plan,
    creditsRemaining: user.creditsRemaining,
    isDemo: identity.isDemo,
  };
}

/** Current user for this request (memoized per request). */
export const getSessionUser = cache(loadSessionUser);

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    const h = await headers();
    const path = h.get("x-pathname") ?? "/app";
    redirect(`/login?next=${encodeURIComponent(path)}`);
  }
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/app");
  return user;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Browser-extension auth: `Authorization: Bearer <token>`. */
export async function userFromBearer(authorization: string | null): Promise<SessionUser | null> {
  const token = authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token || token.length < 20) return null;
  const user = await prisma.user.findUnique({ where: { apiTokenHash: hashToken(token) } });
  if (!user) return null;
  return { id: user.id, email: user.email, name: user.name, role: user.role, plan: user.plan, creditsRemaining: user.creditsRemaining, isDemo: false };
}
