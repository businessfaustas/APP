"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useEffect, useState } from "react";
import { Toaster, toast } from "sonner";

import { Analytics } from "@/components/analytics";
import { ConsentBanner } from "@/components/consent-banner";
import { OfflineBanner } from "@/components/offline-banner";
import { TooltipProvider } from "@/components/ui/misc";
import { installFetchGuard } from "@/lib/client/fetch-guard";
import { I18nProvider, useT } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n/locales";
import type { Messages } from "@/lib/i18n/messages";

/** Browser-wide safety nets: connection loss, stalled requests, crash reports, consent and analytics. */
function ClientGuards() {
  const t = useT();
  useEffect(() => {
    installFetchGuard(
      () => ({ requestFailed: t("offline.requestFailed"), timeout: t("offline.timeout") }),
      (message, id) => toast.error(message, { id }),
    );
  }, [t]);
  return (
    <>
      <OfflineBanner />
      <Analytics />
      <ConsentBanner />
    </>
  );
}

export function Providers({ locale, messages, children }: { locale: Locale; messages: Messages; children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 10_000, refetchOnWindowFocus: false, retry: 1 } },
      }),
  );
  // Marks the page interactive (used by e2e tests to avoid clicking before hydration).
  useEffect(() => {
    document.documentElement.dataset.hydrated = "true";
  }, []);
  return (
    <I18nProvider locale={locale} messages={messages}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
        <QueryClientProvider client={client}>
          <TooltipProvider>
            {children}
            <ClientGuards />
            <Toaster richColors position="top-center" closeButton />
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}
