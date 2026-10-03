import type { Locale } from "../locales";
import { en } from "./en";
import { lt } from "./lt";

/** The English dictionary defines every key; the Lithuanian one must match it exactly. */
export type Messages = typeof en;

const ALL: Record<Locale, Messages> = { en, lt };

export function getMessages(locale: Locale): Messages {
  return ALL[locale];
}
