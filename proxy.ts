import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { demoModeEnabled, supabaseAnonKey, supabaseUrl } from "@/lib/config/deployment";
import { burstLimit } from "@/lib/security/memoryLimit";

const DEMO_COOKIE = "ap_demo_session";
const PROTECTED = [/^\/app(\/|$)/, /^\/admin(\/|$)/];

/** Reachable while MAINTENANCE_MODE is on: health checks only (so monitors can see the 503s are intentional). */
const MAINTENANCE_ALLOWED = [/^\/api\/health$/];
/** Called by other servers or the browser extension, not by a page of ours, so no same-origin check. */
const CROSS_ORIGIN_OK = [/^\/api\/stripe\/webhook$/, /^\/api\/inngest/, /^\/api\/extension\//, /^\/api\/cron\//];
const API_BURST = { max: 240, windowMs: 60_000 };

function maintenanceOn(): boolean {
  return ["1", "true", "yes", "on"].includes(process.env.MAINTENANCE_MODE?.trim().toLowerCase() ?? "");
}

function maintenanceResponse(isApi: boolean): NextResponse {
  const headers = { "retry-after": "300", "cache-control": "no-store" };
  if (isApi) return NextResponse.json({ error: "Down for maintenance. Please try again in a few minutes." }, { status: 503, headers });
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Back soon</title><style>body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#13141c;color:#e8e9f0;font:16px/1.5 system-ui,sans-serif;text-align:center;padding:24px}h1{font-size:1.5rem;margin:0 0 .5rem}p{margin:0;color:#a5a8b8}</style></head><body><main><h1>We&rsquo;ll be right back</h1><p>FlagBid is down for a short maintenance window. Please try again in a few minutes.</p></main></body></html>`;
  return new NextResponse(html, { status: 503, headers: { ...headers, "content-type": "text/html; charset=utf-8" } });
}

function clientKey(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

/**
 * Runs before routes. It
 *  - switches the whole app to a 503 page when MAINTENANCE_MODE is on (the kill switch),
 *  - rejects cross-site state-changing API calls (CSRF) and floods,
 *  - tags every request with an id that also appears in the logs,
 *  - refreshes the Supabase session cookie and redirects signed-out visitors away from /app and /admin.
 * Each API route still checks who the caller is and what they own; this is the outer layer.
 */
export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isApi = path.startsWith("/api/");

  if (maintenanceOn() && !MAINTENANCE_ALLOWED.some((re) => re.test(path))) return maintenanceResponse(isApi);

  // A sign-in or confirmation link that came back to the home page (Supabase does that when our /auth/callback isn't
  // on its allowed list yet) still carries its one-time code: hand it to the callback instead of dropping it.
  if (!isApi && path === "/" && req.nextUrl.searchParams.has("code") && supabaseUrl() && supabaseAnonKey()) {
    const callback = req.nextUrl.clone();
    callback.pathname = "/auth/callback";
    return NextResponse.redirect(callback);
  }

  const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
  const headers = new Headers(req.headers);
  headers.set("x-request-id", requestId);

  if (isApi) {
    const mutating = !["GET", "HEAD", "OPTIONS"].includes(req.method);
    const origin = req.headers.get("origin");
    if (mutating && origin && !CROSS_ORIGIN_OK.some((re) => re.test(path))) {
      let sameSite = false;
      try {
        sameSite = new URL(origin).host === (req.headers.get("x-forwarded-host") ?? req.headers.get("host"));
      } catch {
        sameSite = false;
      }
      if (!sameSite) return NextResponse.json({ error: "Cross-site request blocked." }, { status: 403 });
    }
    const burst = burstLimit(`api:${clientKey(req)}`, API_BURST.max, API_BURST.windowMs);
    if (!burst.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429, headers: { "retry-after": String(burst.retryAfter) } });
    const res = NextResponse.next({ request: { headers } });
    res.headers.set("x-request-id", requestId);
    return res;
  }

  headers.set("x-pathname", `${req.nextUrl.pathname}${req.nextUrl.search}`);
  let res = NextResponse.next({ request: { headers } });
  res.headers.set("x-request-id", requestId);

  const demoMode = demoModeEnabled();
  let signedIn = demoMode && req.cookies.get(DEMO_COOKIE)?.value === "1";

  const url = supabaseUrl();
  const key = supabaseAnonKey();
  if (!signedIn && url && key) {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (toSet) => {
          for (const c of toSet) req.cookies.set(c.name, c.value);
          res = NextResponse.next({ request: { headers } });
          res.headers.set("x-request-id", requestId);
          for (const c of toSet) res.cookies.set(c.name, c.value, c.options);
        },
      },
    });
    const { data } = await supabase.auth.getUser();
    signedIn = Boolean(data.user);
  }

  if (!signedIn && PROTECTED.some((re) => re.test(path))) {
    const login = req.nextUrl.clone();
    login.pathname = "/login";
    login.search = `?next=${encodeURIComponent(`${path}${req.nextUrl.search}`)}`;
    return NextResponse.redirect(login);
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|icons/|manifest.webmanifest|demo-photos/|cars/|email/).*)"],
};
