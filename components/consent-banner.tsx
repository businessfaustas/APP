"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";
import { CONSENT_COOKIE, CONSENT_MAX_AGE_DAYS, consentCookieValue, parseConsent, readCookie, type ConsentChoice } from "@/lib/privacy/consent";

const OPEN_EVENT = "fb-consent-open";

/** Opens the cookie banner again (used by the "Cookie settings" link in the footer). */
export function reopenConsent(): void {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

function store(choice: ConsentChoice): void {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(consentCookieValue(choice))}; Max-Age=${CONSENT_MAX_AGE_DAYS * 86400}; Path=/; SameSite=Lax${secure}`;
}

/**
 * Cookie notice. Essential cookies need no consent, so the only choice is analytics: both
 * buttons are equally prominent and the page works the same either way.
 */
export function ConsentBanner() {
  const t = useT();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const decided = parseConsent(readCookie(document.cookie, CONSENT_COOKIE));
    // Defer so the first paint is not blocked and tests/screenshots can opt out via the cookie.
    const id = window.setTimeout(() => setOpen(!decided), 600);
    const reopen = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, reopen);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener(OPEN_EVENT, reopen);
    };
  }, []);

  if (!open) return null;
  const choose = (c: ConsentChoice) => {
    store(c);
    setOpen(false);
  };
  return (
    <div
      role="dialog"
      aria-label={t("consent.dialogLabel")}
      aria-describedby="consent-body"
      className="bg-card text-card-foreground fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-2xl border p-4 shadow-lg sm:inset-x-auto sm:right-4 sm:bottom-4 sm:mx-0"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <p className="text-sm font-medium">{t("consent.title")}</p>
      <p id="consent-body" className="text-muted-foreground mt-1 text-xs leading-relaxed">
        {t("consent.body")}{" "}
        <Link href="/privacy" className="text-foreground underline">
          {t("consent.policy")}
        </Link>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => choose("essential")}>
          {t("consent.decline")}
        </Button>
        <Button size="sm" variant="outline" onClick={() => choose("analytics")}>
          {t("consent.accept")}
        </Button>
      </div>
    </div>
  );
}
