"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useId, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authFailure, validatePassword } from "@/lib/auth/signup";
import { useT } from "@/lib/i18n/client";

const afterSave = () => `/auth/complete?next=${encodeURIComponent("/app")}`;

/** Choose a new password after following the emailed reset link (the link has already signed them in). */
export function ResetPasswordForm({ supabaseUrl, anonKey, email }: { supabaseUrl: string; anonKey: string; email: string }) {
  const supabase = useMemo(() => createBrowserClient(supabaseUrl, anonKey), [supabaseUrl, anonKey]);
  const t = useT();
  const uid = useId();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const invalid = validatePassword(password, email);
    if (invalid) return setError(t(`auth.err.${invalid}`));
    setBusy(true);
    setError(null);
    const { error: failed } = await supabase.auth.updateUser({ password });
    if (failed) {
      setBusy(false);
      return setError(t(`auth.err.${authFailure(failed)}`));
    }
    // A full page load, so the server sees the new session cookie.
    window.location.assign(afterSave());
  }

  return (
    <form onSubmit={save} noValidate className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor={`${uid}-pw`}>{t("auth.newPassword")}</Label>
        <Input
          id={`${uid}-pw`}
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={`${uid}-hint`}
        />
        <p id={`${uid}-hint`} role={error ? "alert" : undefined} className={error ? "text-stop text-xs" : "text-muted-foreground text-xs"}>
          {error ?? t("auth.passwordHint")}
        </p>
      </div>
      <Button type="submit" className="w-full" size="lg" disabled={busy}>
        {busy ? t("auth.working") : t("auth.savePassword")}
      </Button>
    </form>
  );
}
