import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Logo } from "@/components/brand";
import { SupabaseLogin } from "@/components/auth/supabase-login";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessionUser } from "@/lib/auth/session";
import { env, features } from "@/lib/config/env";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const next = sp.next && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/app";
  if (await getSessionUser()) redirect(next);
  const demo = features.demoMode();
  const supa = features.supabaseAuth();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-10">
      <Logo />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-lg">Sign in</CardTitle>
          <CardDescription>Know your max bid before you bid.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sp.error && <p className="bg-stop-soft text-stop rounded-md px-3 py-2 text-sm">Sign-in failed: {sp.error}</p>}
          {supa && <SupabaseLogin supabaseUrl={env().NEXT_PUBLIC_SUPABASE_URL!} anonKey={env().NEXT_PUBLIC_SUPABASE_ANON_KEY!} next={next} />}
          {supa && demo && (
            <div className="text-muted-foreground flex items-center gap-3 text-xs">
              <div className="bg-border h-px flex-1" />
              or
              <div className="bg-border h-px flex-1" />
            </div>
          )}
          {demo && (
            <form action="/api/auth/demo" method="post" className="space-y-2">
              <input type="hidden" name="next" value={next} />
              <Button type="submit" className="w-full" size="lg" variant={supa ? "outline" : "default"}>
                Continue as demo user
              </Button>
              <p className="text-muted-foreground text-center text-xs">Sample lots and fixture data — no account needed.</p>
            </form>
          )}
          {!demo && !supa && (
            <p className="text-muted-foreground text-sm">
              Sign-in isn&apos;t configured. Set <code className="bg-muted rounded px-1">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
              <code className="bg-muted rounded px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, or set <code className="bg-muted rounded px-1">DEMO_MODE=true</code>
              .
            </p>
          )}
        </CardContent>
      </Card>
      <p className="text-muted-foreground max-w-sm text-center text-xs">
        By continuing you agree to the{" "}
        <a className="underline" href="/terms">
          Terms
        </a>{" "}
        and{" "}
        <a className="underline" href="/privacy">
          Privacy Policy
        </a>
        .
      </p>
    </div>
  );
}
