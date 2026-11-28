/**
 * Countries for the sign-up form and the one-time setup (isomorphic, no I/O).
 * The code is ISO 3166-1 alpha-2; names come from the platform's own country names in the active language.
 */
import { type Locale } from "@/lib/i18n/locales";

/** Countries the app can price an export to: each has a seeded export profile (duty, VAT, freight). */
export const EXPORT_COUNTRIES = ["LT", "LV", "EE", "PL", "DE"] as const;
export type ExportCountry = (typeof EXPORT_COUNTRIES)[number];

/** Shown first in the list, in this order. */
const FEATURED = ["US", ...EXPORT_COUNTRIES] as const;

const ALL_CODES =
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(
    " ",
  );

const KNOWN = new Set(ALL_CODES);

/** An ISO country code from whatever was stored or sent ("lt", " LT "), or null when it isn't one. */
export function normalizeCountry(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.trim().toUpperCase();
  return KNOWN.has(code) ? code : null;
}

export function isExportCountry(code: string | null | undefined): code is ExportCountry {
  return (EXPORT_COUNTRIES as readonly string[]).includes(code ?? "");
}

const namers = new Map<Locale, Intl.DisplayNames | null>();
function namer(locale: Locale): Intl.DisplayNames | null {
  if (!namers.has(locale)) {
    try {
      namers.set(locale, new Intl.DisplayNames([locale], { type: "region" }));
    } catch {
      namers.set(locale, null);
    }
  }
  return namers.get(locale) ?? null;
}

/** The country's name in the given language; falls back to the code. */
export function countryName(code: string, locale: Locale): string {
  const name = namer(locale)?.of(code);
  return name && name !== code ? name : code;
}

export interface CountryOption {
  code: string;
  name: string;
}

/** The sign-up list: the USA and the export countries first, then everything else A–Z in the given language. */
export function countryOptions(locale: Locale): { featured: CountryOption[]; others: CountryOption[] } {
  const featured = FEATURED.map((code) => ({ code, name: countryName(code, locale) }));
  const rest = ALL_CODES.filter((c) => !(FEATURED as readonly string[]).includes(c))
    .map((code) => ({ code, name: countryName(code, locale) }))
    .filter((o) => o.name !== o.code)
    .sort((a, b) => a.name.localeCompare(b.name, locale));
  return { featured, others: rest };
}
