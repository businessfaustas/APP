import Link from "next/link";

import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";

/** A real 404: says what happened, keeps the brand, and offers the next step. */
export default async function NotFound() {
  const t = await getT();
  const user = await getSessionUser().catch(() => null);
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <Logo className="text-2xl" />
      <div className="space-y-2">
        <p className="text-primary text-sm font-semibold tracking-widest">{t("notFound.code")}</p>
        <h1 className="text-3xl font-semibold tracking-tight">{t("notFound.title")}</h1>
        <p className="text-muted-foreground text-sm">{t("notFound.body")}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link href="/">{t("notFound.home")}</Link>
        </Button>
        {user && (
          <Button asChild variant="outline">
            <Link href="/app">{t("notFound.app")}</Link>
          </Button>
        )}
      </div>
    </main>
  );
}
