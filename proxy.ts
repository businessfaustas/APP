import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const DEMO_COOKIE = "ap_demo_session";
const PROTECTED = [/^\/app(\/|$)/, /^\/admin(\/|$)/];

/**
 * Runs before routes: refreshes the Supabase session cookie, passes the pathname to server
 * components, and redirects signed-out visitors away from /app and /admin.
 */
export async function proxy(req: NextRequest) {
  const headers = new Headers(req.headers);
  headers.set("x-pathname", `${req.nextUrl.pathname}${req.nextUrl.search}`);
  let res = NextResponse.next({ request: { headers } });

  const demoMode = process.env.DEMO_MODE === "true" || process.env.DEMO_MODE === "1";
  let signedIn = demoMode && req.cookies.get(DEMO_COOKIE)?.value === "1";

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!signedIn && url && key) {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (toSet) => {
          for (const c of toSet) req.cookies.set(c.name, c.value);
          res = NextResponse.next({ request: { headers } });
          for (const c of toSet) res.cookies.set(c.name, c.value, c.options);
        },
      },
    });
    const { data } = await supabase.auth.getUser();
    signedIn = Boolean(data.user);
  }

  if (!signedIn && PROTECTED.some((re) => re.test(req.nextUrl.pathname))) {
    const login = req.nextUrl.clone();
    login.pathname = "/login";
    login.search = `?next=${encodeURIComponent(`${req.nextUrl.pathname}${req.nextUrl.search}`)}`;
    return NextResponse.redirect(login);
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|icons/|manifest.webmanifest|demo-photos/|api/).*)"],
};
