"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { rememberLocale, useLocale, useT } from "@/lib/i18n/client";
import { type Locale, LOCALES } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";

/** EN | LT toggle. Remembers the choice for a year and re-renders the page in place. */
export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const choose = (next: Locale) => {
    if (next === locale) return;
    rememberLocale(next);
    startTransition(() => router.refresh());
  };
  return (
    <div
      role="group"
      aria-label={t("common.language")}
      className={cn("bg-muted inline-flex rounded-md p-0.5 text-xs font-medium", pending && "opacity-60", className)}
    >
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => choose(l)}
          aria-pressed={l === locale}
          title={l === "en" ? t("common.english") : t("common.lithuanian")}
          className={cn(
            "rounded px-2 py-1 uppercase transition-colors",
            l === locale ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
