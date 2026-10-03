/**
 * Tiny typed translator (isomorphic). `t("report.maxBid")` is checked against the English
 * dictionary; `t.dyn()` looks up keys built at runtime (flag codes, step names) with a fallback.
 */
import type { Locale } from "./locales";
import type { Messages } from "./messages";

type Leaves<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : T[K] extends Record<string, unknown> ? Leaves<T[K], `${P}${K}.`> : never;
}[keyof T & string];

export type MessageKey = Leaves<Messages>;
export type Vars = Record<string, string | number | null | undefined>;

export interface Translator {
  (key: MessageKey, vars?: Vars): string;
  /** Runtime key (e.g. `flags.${code}.title`); returns `fallback` when missing. */
  dyn(key: string, vars?: Vars, fallback?: string): string;
  has(key: string): boolean;
  /** Plural forms: `${key}.one|few|many` (LT has three, EN uses one/many). */
  plural(key: string, n: number, vars?: Vars): string;
  locale: Locale;
}

function lookup(messages: unknown, key: string): string | undefined {
  let cur: unknown = messages;
  for (const part of key.split(".")) {
    if (cur && typeof cur === "object" && part in (cur as Record<string, unknown>)) cur = (cur as Record<string, unknown>)[part];
    else return undefined;
  }
  return typeof cur === "string" ? cur : undefined;
}

/** `{name}` inserts a value; `{n:one|few|many}` picks the plural form for `n` (EN uses one/many). */
export function interpolate(template: string, vars?: Vars, locale: Locale = "en"): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)(?::([^{}]*))?\}/g, (m, name: string, forms: string | undefined) => {
    const v = vars[name];
    if (v === undefined || v === null) return m;
    if (forms === undefined) return String(v);
    const [one = "", few = one, many = few] = forms.split("|");
    const n = Number(String(v).replace(/,/g, ""));
    const form = Number.isFinite(n) ? pluralForm(locale, n) : "many";
    return form === "one" ? one : form === "few" ? few : many;
  });
}

export function pluralForm(locale: Locale, n: number): "one" | "few" | "many" {
  const abs = Math.abs(n);
  if (locale === "lt") {
    const m10 = abs % 10;
    const m100 = abs % 100;
    if (m10 === 1 && m100 !== 11) return "one";
    if (m10 >= 2 && m10 <= 9 && (m100 < 11 || m100 > 19)) return "few";
    return "many";
  }
  return abs === 1 ? "one" : "many";
}

export function createTranslator(locale: Locale, messages: Messages, fallbackMessages?: Messages): Translator {
  const find = (key: string) => lookup(messages, key) ?? (fallbackMessages ? lookup(fallbackMessages, key) : undefined);
  const t = ((key: MessageKey, vars?: Vars) => interpolate(find(key) ?? key, vars, locale)) as Translator;
  t.dyn = (key, vars, fallback) => {
    const found = find(key);
    return found !== undefined ? interpolate(found, vars, locale) : (fallback ?? key);
  };
  t.has = (key) => find(key) !== undefined;
  t.plural = (key, n, vars) => {
    const form = pluralForm(locale, n);
    const found = find(`${key}.${form}`) ?? find(`${key}.many`) ?? key;
    return interpolate(found, { n, ...vars }, locale);
  };
  t.locale = locale;
  return t;
}
