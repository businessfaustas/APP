import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Logo } from "@/components/brand";
import { WelcomeForm } from "@/components/auth/welcome-form";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessionUser } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("welcome.title"), robots: { index: false, follow: false } };
}
export const dynamic = "force-dynamic";

/** The age gate: nobody reaches the app until they confirm they are 18+ and accept the Terms. */
export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  const next = sp.next && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/app";
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (user.consented) redirect(next);
  const t = await getT();
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div className="flex items-center justify-between">
        <Logo className="text-2xl" />
        <LanguageSwitcher />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{t("welcome.title")}</CardTitle>
          <CardDescription>{t("welcome.body")}</CardDescription>
        </CardHeader>
        <CardContent>
          <WelcomeForm next={next} email={user.email} />
        </CardContent>
      </Card>
    </main>
  );
}
