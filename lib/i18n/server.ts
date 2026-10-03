import "server-only";

import { cookies, headers } from "next/headers";
import { cache } from "react";

import { type Locale, LOCALE_COOKIE, resolveLocale } from "./locales";
import { getMessages } from "./messages";
import { createTranslator, type Translator } from "./translate";

/** The visitor's language for this request (cookie → Accept-Language → English). */
export const getLocale = cache(async (): Promise<Locale> => {
  const [c, h] = await Promise.all([cookies(), headers()]);
  return resolveLocale(c.get(LOCALE_COOKIE)?.value, h.get("accept-language"));
});

export async function getT(): Promise<Translator> {
  const locale = await getLocale();
  return createTranslator(locale, getMessages(locale), getMessages("en"));
}
