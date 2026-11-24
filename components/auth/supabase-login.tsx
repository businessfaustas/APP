"use client";

import { createBrowserClient } from "@supabase/ssr";
import { CheckIcon, EyeIcon, EyeOffIcon, MailCheckIcon } from "lucide-react";
import { useId, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authFailure, cleanName, normalizePhone, validateEmail, validateSignUp, type AuthFailure, type FieldError } from "@/lib/auth/signup";
import { useT } from "@/lib/i18n/client";
import { rich } from "@/lib/i18n/rich";
import { AGE_COOKIE } from "@/lib/privacy/consent";
import { cn } from "@/lib/utils";

type Mode = "signin" | "signup" | "forgot";
type Fields = "name" | "email" | "phone" | "password";

function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  invalid,
  describedBy,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  invalid: boolean;
  describedBy?: string;
}) {
  const t = useT();
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        name="password"
        type={shown ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className="pr-11"
      />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-label={shown ? t("auth.hidePassword") : t("auth.showPassword")}
        aria-pressed={shown}
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute inset-y-0 right-0 grid w-10 place-items-center rounded-r-xl outline-none focus-visible:ring-2"
      >
        {shown ? <EyeOffIcon className="size-4" aria-hidden="true" /> : <EyeIcon className="size-4" aria-hidden="true" />}
      </button>
    </div>
  );
}

/**
 * New customers create an account (name, email, phone, password) and confirm their email once; people who already
 * have one just sign in with email and password. Everything talks to Supabase Auth straight from the browser; the
 * server step after (`/auth/complete`, or `/auth/callback` for emailed links) creates the app's own user row.
 */
export function SupabaseLogin({
  supabaseUrl,
  anonKey,
  next,
  google: showGoogle,
  initialMode = "signin",
}: {
  supabaseUrl: string;
  anonKey: string;
  next: string;
  google: boolean;
  initialMode?: "signin" | "signup";
}) {
  const supabase = useMemo(() => createBrowserClient(supabaseUrl, anonKey), [supabaseUrl, anonKey]);
  const t = useT();
  const uid = useId();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  // Age gate: no account is created, and no sign-up starts, until this is ticked.
  const [adult, setAdult] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Fields, FieldError>>>({});
  const [failure, setFailure] = useState<AuthFailure | null>(null);
  const [needsAdult, setNeedsAdult] = useState(false);
  // After sign-up (confirmation mail sent) and after asking for a reset link.
  const [sentTo, setSentTo] = useState<{ kind: "confirm" | "reset"; email: string } | null>(null);
  const [resent, setResent] = useState(false);

  const origin = () => window.location.origin;
  const after = () => `/auth/complete?next=${encodeURIComponent(next)}`;
  const emailLink = (to: string) => `${origin()}/auth/callback?next=${encodeURIComponent(to)}`;

  function rememberAdult() {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${AGE_COOKIE}=1; Max-Age=3600; Path=/; SameSite=Lax${secure}`;
  }

  function switchTo(m: Mode) {
    setMode(m);
    setErrors({});
    setFailure(null);
    setNeedsAdult(false);
    setSentTo(null);
    setResent(false);
    setPassword("");
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setFailure(null);
    const found = validateSignUp({ name, email, phone, password });
    setErrors(found);
    const ticked = adult;
    setNeedsAdult(!ticked);
    if (Object.keys(found).length > 0 || !ticked) return;

    rememberAdult();
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: emailLink(next),
        data: { full_name: cleanName(name), phone_number: normalizePhone(phone), age_confirmed: true, consent_at: new Date().toISOString() },
      },
    });
    setBusy(false);
    if (error) return setFailure(authFailure(error));
    // Supabase answers "success" for an address that already has an account (so nobody can probe who is registered),
    // but with no identities on the returned user. Tell the person plainly instead of promising an email.
    if (data.user && (data.user.identities?.length ?? 0) === 0) return setFailure("alreadyRegistered");
    // With "Confirm email" switched off in Supabase there is a session already, so go straight in.
    if (data.session) return window.location.assign(after());
    setSentTo({ kind: "confirm", email: email.trim() });
  }

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setFailure(null);
    const found: Partial<Record<Fields, FieldError>> = {};
    const emailError = validateEmail(email);
    if (emailError) found.email = emailError;
    if (!password) found.password = "passwordShort";
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setResent(false);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setBusy(false);
      return setFailure(authFailure(error));
    }
    window.location.assign(after());
  }

  async function resendConfirmation() {
    setBusy(true);
    const { error } = await supabase.auth.resend({ type: "signup", email: email.trim(), options: { emailRedirectTo: emailLink(next) } });
    setBusy(false);
    if (error) return setFailure(authFailure(error));
    setFailure(null);
    setResent(true);
  }

  async function sendReset(e: React.FormEvent) {
    e.preventDefault();
    setFailure(null);
    const emailError = validateEmail(email);
    setErrors(emailError ? { email: emailError } : {});
    if (emailError) return;
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: emailLink("/reset-password") });
    setBusy(false);
    // Say the same whether or not the address has an account.
    if (error && authFailure(error) === "rateLimited") return setFailure("rateLimited");
    setSentTo({ kind: "reset", email: email.trim() });
  }

  async function google() {
    if (!adult) return setNeedsAdult(true);
    rememberAdult();
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: emailLink(next) } });
    if (error) setFailure(authFailure(error));
  }

  // An error under a field goes away as soon as the person starts correcting it.
  const clear = (f: Fields) => setErrors((e) => (e[f] ? { ...e, [f]: undefined } : e));

  const err = (f: Fields) => (errors[f] ? t(`auth.err.${errors[f]}`) : null);
  const errId = (f: Fields) => `${uid}-${f}-err`;
  const field = (f: Fields, extra?: string) => (errors[f] ? [errId(f), extra].filter(Boolean).join(" ") : extra);

  if (sentTo) {
    return (
      <div className="space-y-4" data-testid={sentTo.kind === "confirm" ? "check-email" : "reset-sent"}>
        <div className="bg-go-soft flex items-start gap-3 rounded-xl px-4 py-4 text-sm" role="status">
          <MailCheckIcon className="text-go mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <div className="space-y-1">
            <p className="font-semibold">{sentTo.kind === "confirm" ? t("auth.checkEmailTitle") : t("auth.resetTitle")}</p>
            <p>{sentTo.kind === "confirm" ? t("auth.checkEmail", { email: sentTo.email }) : t("auth.resetSent", { email: sentTo.email })}</p>
            <p className="text-muted-foreground text-xs">{t("auth.checkSpam")}</p>
          </div>
        </div>
        {failure && (
          <p role="alert" className="text-stop text-sm">
            {t(`auth.err.${failure}`)}
          </p>
        )}
        {resent && (
          <p role="status" className="text-go flex items-center gap-1.5 text-sm">
            <CheckIcon className="size-4" aria-hidden="true" /> {t("auth.resent")}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm">
          {sentTo.kind === "confirm" && (
            <button
              type="button"
              onClick={resendConfirmation}
              disabled={busy}
              className="text-primary font-medium underline-offset-4 hover:underline disabled:opacity-50"
            >
              {t("auth.resend")}
            </button>
          )}
          <button
            type="button"
            onClick={() => switchTo(sentTo.kind === "confirm" ? "signup" : "signin")}
            className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          >
            {sentTo.kind === "confirm" ? t("auth.otherEmail") : t("auth.backToSignIn")}
          </button>
        </div>
      </div>
    );
  }

  const adultBox = (
    <div className="space-y-1">
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          name="adult"
          className="accent-brand mt-0.5 size-4 shrink-0"
          checked={adult}
          onChange={(e) => {
            setAdult(e.target.checked);
            if (e.target.checked) setNeedsAdult(false);
          }}
          aria-describedby={needsAdult ? `${uid}-adult-err` : undefined}
        />
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
      {needsAdult && (
        <p id={`${uid}-adult-err`} role="alert" className="text-stop text-xs">
          {t("loginGate.required")}
        </p>
      )}
    </div>
  );

  const resentBanner = resent && !failure && (
    <p role="status" className="bg-go-soft text-go flex items-center gap-2 rounded-md px-3 py-2 text-sm" data-testid="auth-resent">
      <CheckIcon className="size-4 shrink-0" aria-hidden="true" /> {t("auth.resent")}
    </p>
  );

  const failureBanner = failure && (
    <div role="alert" className="bg-stop-soft text-stop space-y-1.5 rounded-md px-3 py-2 text-sm" data-testid="auth-error">
      <p>{t(`auth.err.${failure}`)}</p>
      {failure === "unconfirmed" && (
        <button type="button" onClick={resendConfirmation} disabled={busy} className="font-medium underline underline-offset-4 disabled:opacity-50">
          {t("auth.resend")}
        </button>
      )}
      {failure === "alreadyRegistered" && (
        <button type="button" onClick={() => switchTo("signin")} className="font-medium underline underline-offset-4">
          {t("auth.signIn")}
        </button>
      )}
    </div>
  );

  const emailField = (
    <div className="space-y-1.5">
      <Label htmlFor={`${uid}-email`}>{t("auth.email")}</Label>
      <Input
        id={`${uid}-email`}
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          clear("email");
        }}
        placeholder="you@example.com"
        aria-invalid={errors.email ? true : undefined}
        aria-describedby={field("email")}
      />
      {errors.email && (
        <p id={errId("email")} className="text-stop text-xs">
          {err("email")}
        </p>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {mode !== "forgot" && (
        <div role="tablist" aria-label={t("auth.title")} className="bg-muted grid grid-cols-2 gap-1 rounded-xl p-1">
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              id={`${uid}-tab-${m}`}
              aria-selected={mode === m}
              aria-controls={`${uid}-panel`}
              onClick={() => mode !== m && switchTo(m)}
              className={cn(
                "focus-visible:ring-ring rounded-lg px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2",
                mode === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m === "signin" ? t("auth.tabSignIn") : t("auth.tabCreate")}
            </button>
          ))}
        </div>
      )}

      <div
        id={`${uid}-panel`}
        role={mode === "forgot" ? undefined : "tabpanel"}
        aria-labelledby={mode === "forgot" ? undefined : `${uid}-tab-${mode}`}
        className="space-y-4"
      >
        {mode === "forgot" && (
          <form onSubmit={sendReset} noValidate className="space-y-4" aria-label={t("auth.resetTitle")}>
            <div className="space-y-1">
              <h3 className="font-semibold">{t("auth.resetTitle")}</h3>
              <p className="text-muted-foreground text-sm">{t("auth.resetBody")}</p>
            </div>
            {failureBanner}
            {emailField}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? t("auth.working") : t("auth.resetSend")}
            </Button>
            <button
              type="button"
              onClick={() => switchTo("signin")}
              className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
            >
              {t("auth.backToSignIn")}
            </button>
          </form>
        )}

        {mode === "signin" && (
          <form onSubmit={signIn} noValidate className="space-y-4">
            {failureBanner}
            {resentBanner}
            {emailField}
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <Label htmlFor={`${uid}-password`}>{t("auth.password")}</Label>
                <button type="button" onClick={() => switchTo("forgot")} className="text-primary text-xs font-medium underline-offset-4 hover:underline">
                  {t("auth.forgot")}
                </button>
              </div>
              <PasswordInput
                id={`${uid}-password`}
                value={password}
                onChange={(v) => {
                  setPassword(v);
                  clear("password");
                }}
                autoComplete="current-password"
                invalid={Boolean(errors.password)}
                describedBy={field("password")}
              />
              {errors.password && (
                <p id={errId("password")} className="text-stop text-xs">
                  {err("password")}
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={busy}>
              {busy ? t("auth.working") : t("auth.signIn")}
            </Button>
            <p className="text-muted-foreground text-center text-sm">
              {t("auth.noAccount")}{" "}
              <button type="button" onClick={() => switchTo("signup")} className="text-primary font-medium underline-offset-4 hover:underline">
                {t("auth.tabCreate")}
              </button>
            </p>
          </form>
        )}

        {mode === "signup" && (
          <form onSubmit={signUp} noValidate className="space-y-4">
            {failureBanner}
            <div className="space-y-1.5">
              <Label htmlFor={`${uid}-name`}>{t("auth.name")}</Label>
              <Input
                id={`${uid}-name`}
                name="name"
                autoComplete="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  clear("name");
                }}
                placeholder={t("auth.namePlaceholder")}
                aria-invalid={errors.name ? true : undefined}
                aria-describedby={field("name")}
              />
              {errors.name && (
                <p id={errId("name")} className="text-stop text-xs">
                  {err("name")}
                </p>
              )}
            </div>
            {emailField}
            <div className="space-y-1.5">
              <Label htmlFor={`${uid}-phone`}>{t("auth.phone")}</Label>
              <Input
                id={`${uid}-phone`}
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  clear("phone");
                }}
                placeholder="+370 600 12345"
                aria-invalid={errors.phone ? true : undefined}
                aria-describedby={field("phone", `${uid}-phone-hint`)}
              />
              {errors.phone ? (
                <p id={errId("phone")} className="text-stop text-xs">
                  {err("phone")}
                </p>
              ) : (
                <p id={`${uid}-phone-hint`} className="text-muted-foreground text-xs">
                  {t("auth.phoneHint")}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${uid}-password`}>{t("auth.password")}</Label>
              <PasswordInput
                id={`${uid}-password`}
                value={password}
                onChange={(v) => {
                  setPassword(v);
                  clear("password");
                }}
                autoComplete="new-password"
                invalid={Boolean(errors.password)}
                describedBy={field("password", `${uid}-password-hint`)}
              />
              {errors.password ? (
                <p id={errId("password")} className="text-stop text-xs">
                  {err("password")}
                </p>
              ) : (
                <p id={`${uid}-password-hint`} className="text-muted-foreground text-xs">
                  {t("auth.passwordHint")}
                </p>
              )}
            </div>
            {adultBox}
            <Button type="submit" className="w-full" size="lg" disabled={busy}>
              {busy ? t("auth.working") : t("auth.createAccount")}
            </Button>
            <p className="text-muted-foreground text-center text-sm">
              {t("auth.haveAccount")}{" "}
              <button type="button" onClick={() => switchTo("signin")} className="text-primary font-medium underline-offset-4 hover:underline">
                {t("auth.tabSignIn")}
              </button>
            </p>
          </form>
        )}

        {showGoogle && mode !== "forgot" && (
          <>
            <div className="text-muted-foreground flex items-center gap-3 text-xs">
              <div className="bg-border h-px flex-1" />
              {t("auth.or")}
              <div className="bg-border h-px flex-1" />
            </div>
            {mode === "signin" && adultBox}
            <Button variant="outline" className="w-full" onClick={google} type="button">
              <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
                <path
                  fill="#EA4335"
                  d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12s4.4 9.8 9.8 9.8c5.7 0 9.4-4 9.4-9.6 0-.6-.1-1.1-.2-1.6H12z"
                />
              </svg>
              {t("auth.google")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
