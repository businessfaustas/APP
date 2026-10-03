"use client";

import { createContext, useContext, useMemo } from "react";

import { DEFAULT_LOCALE, type Locale, LOCALE_COOKIE } from "./locales";
import type { Messages } from "./messages";
import { createTranslator, type Translator } from "./translate";

const I18nContext = createContext<{ locale: Locale; messages: Messages | null }>({ locale: DEFAULT_LOCALE, messages: null });

export function I18nProvider({ locale, messages, children }: { locale: Locale; messages: Messages; children: React.ReactNode }) {
  const value = useMemo(() => ({ locale, messages }), [locale, messages]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(I18nContext).locale;
}

export function useT(): Translator {
  const { locale, messages } = useContext(I18nContext);
  if (!messages) throw new Error("useT() must be used inside <I18nProvider>");
  return useMemo(() => createTranslator(locale, messages), [locale, messages]);
}

/** Remembers the chosen language for a year; the server reads it on the next request. */
export function rememberLocale(locale: Locale): void {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}
