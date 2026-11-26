import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locales";

/** The language each locale's AI-written text is requested in (the model is told the name, not the code). */
const LANGUAGE_NAME: Record<Locale, string> = { en: "English", lt: "Lithuanian" };

/**
 * A prompt paragraph telling the model which language its free text (summaries, notes, reasons, evidence, reasoning)
 * is written in. Empty for English, so English prompts, and the cache keys that hash them, stay exactly as they were.
 *
 * Only prose changes language. Part names, enum values, JSON keys, VINs and money (`$3,100`) stay as the schema and the
 * app expect them: the part names are looked up by the display dictionary, and the number guard compares `$` amounts.
 */
export function languageNote(locale: Locale | null | undefined): string {
  const l = locale ?? DEFAULT_LOCALE;
  if (l === DEFAULT_LOCALE) return "";
  return `LANGUAGE
Write every free-text field (summary, notes, reasons, evidence, messages, reasoning) in ${LANGUAGE_NAME[l]}, in natural everyday wording that a car buyer would use.
Do NOT translate or change: JSON keys, enum values, part names, VINs, numbers, or money amounts (keep "$3,100" exactly as a dollar figure).`;
}

/** Cache-key suffix: empty for English (so existing cached English results stay valid), `:lt` etc. otherwise. */
export function languageCacheSuffix(locale: Locale | null | undefined): string {
  const l = locale ?? DEFAULT_LOCALE;
  return l === DEFAULT_LOCALE ? "" : `:${l}`;
}

/** Validates the stored `Analysis.locale` string; anything unknown falls back to English. */
export function asLocale(v: unknown): Locale {
  return v === "lt" ? "lt" : DEFAULT_LOCALE;
}
