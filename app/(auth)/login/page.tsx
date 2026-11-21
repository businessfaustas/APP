import { CheckIcon } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Logo } from "@/components/brand";
import { SupabaseLogin } from "@/components/auth/supabase-login";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Showcase } from "@/components/marketing/showcase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessionUser } from "@/lib/auth/session";
import { env, features } from "@/lib/config/env";
import { demoShowcase } from "@/lib/demo/showcase";
import { getT } from "@/lib/i18n/server";
import { rich } from "@/lib/i18n/rich";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("auth.title") };
}
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const next = sp.next && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/app";
  if (await getSessionUser()) redirect(next);
  const demo = features.demoMode();
  const supa = features.supabaseAuth();
  const t = await getT();

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.08fr_1fr]">
      <aside className="bg-sidebar relative hidden flex-col justify-between gap-8 overflow-hidden border-r p-10 lg:flex xl:p-14">
        <Logo className="text-3xl" />
        <div className="mx-auto w-full max-w-xl space-y-8">
          <Showcase data={demoShowcase(t)} />
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-balance">{t("auth.tagline")}</h2>
            <ul className="mt-5 space-y-3">
              {(["point1", "point2", "point3"] as const).map((k, i) => (
                <li key={k} className="rise flex items-center gap-3 text-sm" style={{ ["--i" as string]: 4 + i }}>
                  <span className="bg-go-soft text-go grid size-6 shrink-0 place-items-center rounded-full">
                    <CheckIcon className="size-3.5" aria-hidden="true" />
                  </span>
                  {t(`auth.${k}`)}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="text-muted-foreground text-xs">{t("landing.freeNote")}</p>
      </aside>
      <main className="flex flex-col items-center justify-center gap-6 px-4 py-10">
        <div className="flex w-full max-w-sm items-center justify-between">
          <div className="lg:invisible">
            <Logo className="text-2xl" />
          </div>
          <LanguageSwitcher />
        </div>
        <Card className="rise w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-2xl">{t("auth.title")}</CardTitle>
            <CardDescription>{t("auth.tagline")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {sp.error && <p className="bg-stop-soft text-stop rounded-md px-3 py-2 text-sm">{t("auth.failed", { reason: sp.error })}</p>}
            {supa && <SupabaseLogin supabaseUrl={env().NEXT_PUBLIC_SUPABASE_URL!} anonKey={env().NEXT_PUBLIC_SUPABASE_ANON_KEY!} next={next} />}
            {supa && demo && (
              <div className="text-muted-foreground flex items-center gap-3 text-xs">
                <div className="bg-border h-px flex-1" />
                {t("auth.or")}
                <div className="bg-border h-px flex-1" />
              </div>
            )}
            {demo && (
              <form action="/api/auth/demo" method="post" className="space-y-2">
                <input type="hidden" name="next" value={next} />
                <Button type="submit" className="w-full" size="lg" variant={supa ? "outline" : "default"}>
                  {t("auth.continueDemo")}
                </Button>
                <p className="text-muted-foreground text-center text-xs">{t("auth.demoNote")}</p>
              </form>
            )}
            {!demo && !supa && <p className="text-muted-foreground text-sm">{t("auth.notConfigured")}</p>}
          </CardContent>
        </Card>
        <p className="text-muted-foreground max-w-sm text-center text-xs">
          {rich(t("auth.agree"), {
            terms: (
              <a className="underline" href="/terms">
                {t("auth.terms")}
              </a>
            ),
            privacy: (
              <a className="underline" href="/privacy">
                {t("auth.privacy")}
              </a>
            ),
          })}
        </p>
      </main>
    </div>
  );
}
