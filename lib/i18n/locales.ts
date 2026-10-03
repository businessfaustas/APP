/** Supported UI languages (isomorphic). */
export const LOCALES = ["en", "lt"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "ap_locale";

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}

/** Cookie first, then the browser's Accept-Language (Lithuanian browsers get LT), then English. */
export function resolveLocale(cookie: string | null | undefined, acceptLanguage: string | null | undefined): Locale {
  if (isLocale(cookie)) return cookie;
  const first = (acceptLanguage ?? "").split(",")[0]?.trim().toLowerCase() ?? "";
  return first.startsWith("lt") ? "lt" : DEFAULT_LOCALE;
}

/** BCP 47 tag for Intl formatting. */
export const INTL_LOCALE: Record<Locale, string> = { en: "en-US", lt: "lt-LT" };
