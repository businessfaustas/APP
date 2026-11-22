import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * "Check auth on every endpoint", enforced. Every route file under app/api and app/auth must be
 * listed here with how it is protected. Add a route without adding it here and this test fails.
 * It then calls each protected route with no credentials (and, for admin routes, with an
 * ordinary user) and expects a refusal.
 */
type Policy = "user" | "admin" | "bearer" | "cron" | "webhook" | "inngest" | "public";

const POLICY: Record<string, { policy: Policy; why?: string }> = {
  "app/api/account/route.ts": { policy: "user" },
  "app/api/admin/export-profiles/route.ts": { policy: "admin" },
  "app/api/admin/fees/route.ts": { policy: "admin" },
  "app/api/admin/integrations/route.ts": { policy: "admin" },
  "app/api/admin/references/route.ts": { policy: "admin" },
  "app/api/admin/users/route.ts": { policy: "admin" },
  "app/api/analyses/[id]/rerun/route.ts": { policy: "user" },
  "app/api/analyses/[id]/resume/route.ts": { policy: "user" },
  "app/api/analyses/[id]/route.ts": { policy: "user" },
  "app/api/analyses/[id]/share/route.ts": { policy: "user" },
  "app/api/analyses/route.ts": { policy: "user" },
  "app/api/analytics/route.ts": { policy: "public", why: "anonymous, consent-gated, rate limited, stores no identifiers" },
  "app/api/auth/demo/route.ts": { policy: "public", why: "demo sign-in; refuses unless demo mode is on" },
  "app/api/auth/logout/route.ts": { policy: "public", why: "clears the caller's own session" },
  "app/api/batches/[id]/route.ts": { policy: "user" },
  "app/api/batches/route.ts": { policy: "user" },
  "app/api/client-error/route.ts": { policy: "public", why: "browser error beacon; rate limited and size capped" },
  "app/api/consent/route.ts": { policy: "user" },
  "app/api/cron/[job]/route.ts": { policy: "cron" },
  "app/api/extension/ingest/route.ts": { policy: "bearer" },
  "app/api/health/route.ts": { policy: "public", why: "uptime probe; returns no secrets and no user data" },
  "app/api/inngest/route.ts": { policy: "inngest", why: "signature checked by the Inngest SDK" },
  "app/api/journal/route.ts": { policy: "user" },
  "app/api/photos/[id]/route.ts": { policy: "user" },
  "app/api/settings/route.ts": { policy: "user" },
  "app/api/stripe/checkout/route.ts": { policy: "user" },
  "app/api/stripe/portal/route.ts": { policy: "user" },
  "app/api/stripe/webhook/route.ts": { policy: "webhook" },
  "app/api/uploads/route.ts": { policy: "user" },
  "app/api/unsubscribe/route.ts": { policy: "public", why: "one-click unsubscribe; authorised by a signed token, not a session" },
  "app/api/vin/[vin]/route.ts": { policy: "user" },
  "app/api/vitals/route.ts": { policy: "public", why: "anonymous web-vitals beacon; rate limited and size capped" },
  "app/api/watchlist/route.ts": { policy: "user" },
  "app/auth/callback/route.ts": { policy: "public", why: "exchanges a one-time Supabase code for a session" },
};

const ROOT = process.cwd();
function routeFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) routeFiles(p, out);
    else if (entry.name === "route.ts") out.push(p.split(sep).join("/"));
  }
  return out;
}
const files = [...routeFiles("app/api"), ...routeFiles("app/auth")].sort();

// Set before any handler reads the (cached) environment.
process.env.CRON_SECRET = "right-secret";
process.env.STRIPE_SECRET_KEY = "sk_test_x";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_x";

const session = vi.hoisted(() => ({ user: null as unknown }));
vi.mock("@/lib/auth/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/session")>()),
  getSessionUser: vi.fn(async () => session.user),
}));

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
const PARAMS = { id: "x", job: "maintenance", vin: "1HGCM82633A004352" };

async function call(file: string, method: string, headers: Record<string, string> = {}): Promise<Response | null> {
  const mod = (await import(/* @vite-ignore */ `${ROOT}/${file}`)) as Record<string, unknown>;
  const handler = mod[method] as ((req: Request, ctx: { params: Promise<typeof PARAMS> }) => Promise<Response>) | undefined;
  if (!handler) return null;
  const hasBody = method !== "GET";
  const req = new Request("http://localhost/api/test", {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: hasBody ? "{}" : undefined,
  });
  return handler(req, { params: Promise.resolve(PARAMS) });
}

describe("API auth policy", () => {
  it("lists every route file, and nothing that no longer exists", () => {
    expect(files.filter((f) => !(f in POLICY))).toEqual([]);
    expect(Object.keys(POLICY).filter((f) => !files.includes(f))).toEqual([]);
  });

  it("every public route has a written reason", () => {
    for (const [file, p] of Object.entries(POLICY)) if (p.policy === "public") expect(p.why, file).toBeTruthy();
  });

  it("each route's source contains the check its policy promises", () => {
    const needle: Record<Policy, RegExp | null> = {
      user: /getSessionUser\(/,
      admin: /adminFromRequest\(/,
      bearer: /userFromBearer\(/,
      cron: /CRON_SECRET/,
      webhook: /constructEvent\(/,
      inngest: /serve\(/,
      public: null,
    };
    for (const [file, { policy }] of Object.entries(POLICY)) {
      const re = needle[policy];
      if (re) expect(readFileSync(join(ROOT, file), "utf8"), `${relative(ROOT, file)} (${policy})`).toMatch(re);
    }
  });
});

describe("protected routes refuse callers with no credentials", () => {
  beforeEach(() => {
    session.user = null;
  });

  for (const [file, { policy }] of Object.entries(POLICY)) {
    if (policy !== "user" && policy !== "admin" && policy !== "bearer" && policy !== "cron") continue;
    for (const method of METHODS) {
      it(`${method} /${file.replace(/^app\//, "").replace(/\/route\.ts$/, "")} → refused`, async () => {
        const res = await call(file, method);
        if (!res) return; // the route does not handle this method
        expect([401, 403]).toContain(res.status);
      });
    }
  }

  it("admin routes also refuse an ordinary signed-in user", async () => {
    session.user = { id: "u1", email: "u@example.com", name: null, role: "USER", plan: "FREE", creditsRemaining: 3, isDemo: false };
    for (const [file, { policy }] of Object.entries(POLICY)) {
      if (policy !== "admin") continue;
      for (const method of METHODS) {
        const res = await call(file, method);
        if (res) expect(res.status, `${method} ${file}`).toBe(403);
      }
    }
  });

  it("the cron endpoint refuses a wrong bearer secret", async () => {
    const res = await call("app/api/cron/[job]/route.ts", "GET", { authorization: "Bearer wrong-secret" });
    expect(res?.status).toBe(401);
  });

  it("the Stripe webhook refuses an unsigned or badly signed body", async () => {
    const unsigned = await call("app/api/stripe/webhook/route.ts", "POST");
    expect(unsigned?.status).toBe(400);
    const forged = await call("app/api/stripe/webhook/route.ts", "POST", { "stripe-signature": "t=1,v1=deadbeef" });
    expect(forged?.status).toBe(400);
  });
});
