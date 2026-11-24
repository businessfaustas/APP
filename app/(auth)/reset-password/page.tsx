import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Logo } from "@/components/brand";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabaseServer } from "@/lib/auth/session";
import { env, features } from "@/lib/config/env";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("auth.newPasswordTitle"), robots: { index: false } };
}
export const dynamic = "force-dynamic";

/** The emailed password-reset link lands here (via /auth/callback) already signed in; without that, send them back to sign in. */
export default async function ResetPasswordPage() {
  if (!features.supabaseAuth()) redirect("/login");
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  if (!data.user?.email) redirect("/login?error=expired");
  const t = await getT();

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-10">
      <Logo className="text-2xl" />
      <Card className="rise w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">{t("auth.newPasswordTitle")}</CardTitle>
          <CardDescription>{data.user.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <ResetPasswordForm supabaseUrl={env().NEXT_PUBLIC_SUPABASE_URL!} anonKey={env().NEXT_PUBLIC_SUPABASE_ANON_KEY!} email={data.user.email} />
        </CardContent>
      </Card>
    </main>
  );
}
