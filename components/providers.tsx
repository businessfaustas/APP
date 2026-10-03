"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";

import { TooltipProvider } from "@/components/ui/misc";
import { I18nProvider } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n/locales";
import type { Messages } from "@/lib/i18n/messages";

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
            <Toaster richColors position="top-center" closeButton />
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}
