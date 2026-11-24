"use client";

import { createBrowserClient } from "@supabase/ssr";
import { MailIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n/client";
import { rich } from "@/lib/i18n/rich";
import { AGE_COOKIE } from "@/lib/privacy/consent";

export function SupabaseLogin({ supabaseUrl, anonKey, next, google: showGoogle }: { supabaseUrl: string; anonKey: string; next: string; google: boolean }) {
  const supabase = useMemo(() => createBrowserClient(supabaseUrl, anonKey), [supabaseUrl, anonKey]);
  const t = useT();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  // Age gate: no email is collected, and no sign-in starts, until this is ticked.
  const [adult, setAdult] = useState(false);
  const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` : undefined;

  function rememberAdult() {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${AGE_COOKIE}=1; Max-Age=3600; Path=/; SameSite=Lax${secure}`;
  }

  async function magicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!adult) return;
    rememberAdult();
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
    setBusy(false);
    if (error) toast.error(error.message);
    else setSent(true);
  }

  async function google() {
    if (!adult) return;
    rememberAdult();
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
    if (error) toast.error(error.message);
  }

  if (sent) {
    return <div className="bg-go-soft rounded-md px-3 py-3 text-sm">{t("auth.linkSent", { email })}</div>;
  }

  return (
    <div className="space-y-3">
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" className="accent-brand mt-0.5 size-4 shrink-0" checked={adult} onChange={(e) => setAdult(e.target.checked)} />
        <span>
          {rich(t("loginGate.confirm"), {
            terms: (
              <a className="underline" href="/terms" target="_blank" rel="noreferrer">
                {t("auth.terms")}
              </a>
            ),
            privacy: (
              <a className="underline" href="/privacy" target="_blank" rel="noreferrer">
                {t("auth.privacy")}
              </a>
            ),
          })}
        </span>
      </label>
      {showGoogle && (
        <Button variant="outline" className="w-full" onClick={google} type="button" disabled={!adult} aria-describedby={adult ? undefined : "age-required"}>
          <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
            <path
              fill="#EA4335"
              d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12s4.4 9.8 9.8 9.8c5.7 0 9.4-4 9.4-9.6 0-.6-.1-1.1-.2-1.6H12z"
            />
          </svg>
          {t("auth.google")}
        </Button>
      )}
      <form onSubmit={magicLink} className="space-y-2">
        <Label htmlFor="email">{t("auth.email")}</Label>
        <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        <Button type="submit" className="w-full" disabled={busy || !adult} aria-describedby={adult ? undefined : "age-required"}>
          <MailIcon /> {busy ? t("common.sending") : t("auth.sendLink")}
        </Button>
        {!adult && (
          <p id="age-required" className="text-muted-foreground text-xs">
            {t("loginGate.required")}
          </p>
        )}
      </form>
      <p className="text-muted-foreground border-t pt-3 text-xs leading-relaxed">{t("auth.newHere")}</p>
    </div>
  );
}
