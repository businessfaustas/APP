/**
 * Cookie / analytics consent, kept in one first-party cookie. Essential cookies (sign-in
 * session, theme, language, this consent record) need no consent; analytics and performance
 * measurement run only after the visitor opts in. No third-party scripts, and no session
 * replay of any kind, are ever loaded.
 */
export const CONSENT_COOKIE = "fb_consent";
export const CONSENT_MAX_AGE_DAYS = 180;

export type ConsentChoice = "analytics" | "essential";

export function parseConsent(raw: string | null | undefined): ConsentChoice | null {
  const m = raw?.match(/^v1:(analytics|essential)$/);
  return m ? (m[1] as ConsentChoice) : null;
}

export function consentCookieValue(choice: ConsentChoice): string {
  return `v1:${choice}`;
}

/** Reads one cookie out of a `Cookie` header or `document.cookie` string. */
export function readCookie(header: string | null | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return undefined;
}

export function analyticsAllowed(cookieHeader: string | null | undefined): boolean {
  return parseConsent(readCookie(cookieHeader, CONSENT_COOKIE)) === "analytics";
}
