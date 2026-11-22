"use client";

import { TriangleAlertIcon } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { reportClientError } from "@/lib/analytics/client";
import { useT } from "@/lib/i18n/client";

/**
 * The friendly screen shown when a page crashes: no stack trace, no database message, just what
 * happened, a way to retry, and a reference to quote. The crash itself is reported
 * (error table, Sentry, alert) so we find out without the user having to tell us.
 */
export function ErrorView({ error, retry, scope }: { error: Error & { digest?: string }; retry: () => void; scope: "site" | "app" }) {
  const t = useT();
  useEffect(() => {
    reportClientError(error, { digest: error.digest });
  }, [error]);
  const app = scope === "app";
  return (
    <div role="alert" className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-5 px-4 py-16 text-center">
      <span className="bg-stop-soft text-stop grid size-12 place-items-center rounded-full">
        <TriangleAlertIcon className="size-6" aria-hidden="true" />
      </span>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{app ? t("errors.appTitle") : t("errors.title")}</h1>
        <p className="text-muted-foreground text-sm">{app ? t("errors.appBody") : t("errors.body")}</p>
        {error.digest && <p className="text-muted-foreground font-mono text-xs">{t("errors.ref", { digest: error.digest })}</p>}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={() => retry()}>{t("errors.retry")}</Button>
        <Button asChild variant="outline">
          <Link href={app ? "/app" : "/"}>{app ? t("errors.dashboard") : t("errors.home")}</Link>
        </Button>
      </div>
    </div>
  );
}
