"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";
import { rich } from "@/lib/i18n/rich";

/** Age and terms confirmation, shown once to anyone who has not given it (the age gate). */
export function WelcomeForm({ next, email }: { next: string; email: string }) {
  const t = useT();
  const [age, setAge] = useState(false);
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!age || !terms) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/consent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ageConfirmed: true, termsAccepted: true }),
      });
      if (!res.ok) throw new Error("consent failed");
      window.location.assign(next);
    } catch {
      setError(t("welcome.failed"));
      setBusy(false);
    }
  }

  const links = {
    terms: (
      <Link className="underline" href="/terms" target="_blank">
        {t("auth.terms")}
      </Link>
    ),
    privacy: (
      <Link className="underline" href="/privacy" target="_blank">
        {t("auth.privacy")}
      </Link>
    ),
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" className="accent-brand mt-0.5 size-4 shrink-0" checked={age} onChange={(e) => setAge(e.target.checked)} required />
        <span>{t("welcome.age")}</span>
      </label>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" className="accent-brand mt-0.5 size-4 shrink-0" checked={terms} onChange={(e) => setTerms(e.target.checked)} required />
        <span>{rich(t("welcome.terms"), links)}</span>
      </label>
      <p className="text-muted-foreground text-xs">{t("welcome.ageNote")}</p>
      {error && (
        <p role="alert" className="bg-stop-soft text-stop rounded-md px-3 py-2 text-sm">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" size="lg" disabled={!age || !terms || busy}>
        {busy ? t("welcome.saving") : t("welcome.continue")}
      </Button>
      <p className="text-muted-foreground text-center text-xs">
        {t("welcome.signedInAs", { email })} ·{" "}
        <button type="submit" formAction="/api/auth/logout" formMethod="post" formNoValidate className="underline">
          {t("welcome.notYou")}
        </button>
      </p>
    </form>
  );
}
