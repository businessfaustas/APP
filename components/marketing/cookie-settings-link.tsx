"use client";

import { reopenConsent } from "@/components/consent-banner";
import { useT } from "@/lib/i18n/client";

export function CookieSettingsLink() {
  const t = useT();
  return (
    <button type="button" onClick={reopenConsent} className="hover:text-foreground text-left">
      {t("consent.manage")}
    </button>
  );
}
