"use client";

import { Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

type Resale = "US" | string; // "US" or an export country code
type Choice = { value: string; label: string };

function Options({
  name,
  value,
  onChange,
  options,
  describedBy,
}: {
  name: string;
  value: string | null;
  onChange: (v: string) => void;
  options: (Choice & { hint?: string })[];
  describedBy?: string;
}) {
  return (
    <div role="radiogroup" aria-describedby={describedBy} className="grid gap-2">
      {options.map((o) => (
        <label
          key={o.value}
          className={cn(
            "bg-card hover:border-primary/60 flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors",
            "has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:focus-visible]:ring-ring/50 has-[:focus-visible]:ring-[3px]",
          )}
        >
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
            className="accent-primary mt-1 size-4"
          />
          <span className="min-w-0">
            <span className="block text-sm font-medium">{o.label}</span>
            {o.hint && <span className="text-muted-foreground block text-xs">{o.hint}</span>}
          </span>
        </label>
      ))}
    </div>
  );
}

function Question({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="flex items-center gap-2.5 text-base font-semibold">
        <span className="bg-primary/15 text-primary grid size-6 place-items-center rounded-full text-xs font-bold" aria-hidden="true">
          {n}
        </span>
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

/**
 * The one-time setup: where the buyer resells, whether they have a VAT number, how they buy at the auctions. The server turns
 * the answers into settings (lib/setup/derive.ts); nothing here decides a number.
 */
export function SetupForm({
  exportCountries,
  suggested,
  countryName,
  unsupportedCountry,
  initialZip,
}: {
  /** Countries an export can be priced to, with their names in the page's language. */
  exportCountries: { code: string; name: string }[];
  /** "US" or an export country code to preselect, from the country given at sign-up. */
  suggested: Resale | null;
  /** The sign-up country's name, shown when it can't be priced. */
  countryName: string | null;
  unsupportedCountry: boolean;
  initialZip: string;
}) {
  const t = useT();
  const router = useRouter();
  const uid = useId();
  const [resale, setResale] = useState<Resale | null>(suggested);
  const [zip, setZip] = useState(initialZip);
  const [vat, setVat] = useState<"yes" | "no" | null>(null);
  const [licence, setLicence] = useState<"yes" | "no" | null>(null);
  const [brokerFee, setBrokerFee] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isExport = resale !== null && resale !== "US";
  const zipOk = /^\d{5}$/.test(zip.trim());
  const ready = resale !== null && (resale !== "US" || zipOk) && (!isExport || vat !== null) && licence !== null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || resale === null) return setError(resale === null ? t("setup.chooseResale") : t("setup.failed"));
    setBusy(true);
    setError(null);
    try {
      const fee = Number(brokerFee.replace(/[^\d]/g, ""));
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          resale: resale === "US" ? { kind: "US", homeZip: zip.trim() } : { kind: "EXPORT", country: resale },
          hasVatNumber: isExport && vat === "yes",
          hasLicence: licence === "yes",
          ...(licence === "no" && brokerFee.trim() && Number.isFinite(fee) ? { brokerFee: fee } : {}),
        }),
      });
      if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? t("setup.failed"));
      toast.success(t("setup.saved"));
      router.push("/app");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("setup.failed"));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} noValidate data-testid="setup-form">
      <Card>
        <CardContent className="space-y-8 pt-6">
          <Question n={1} title={t("setup.q1")}>
            {unsupportedCountry && countryName && (
              <p className="bg-caution-soft rounded-lg px-3 py-2 text-sm">{t("setup.countryUnsupported", { country: countryName })}</p>
            )}
            <Options
              name={`${uid}-resale`}
              value={resale}
              onChange={setResale}
              options={[
                { value: "US", label: t("setup.resaleUs") },
                ...exportCountries.map((c) => ({ value: c.code, label: t("setup.resaleExport", { country: c.name }) })),
              ]}
            />
            {resale === "US" && (
              <div className="space-y-1.5">
                <Label htmlFor={`${uid}-zip`}>{t("setup.zip")}</Label>
                <Input
                  id={`${uid}-zip`}
                  name="zip"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  maxLength={5}
                  value={zip}
                  onChange={(e) => setZip(e.target.value.replace(/\D/g, ""))}
                  placeholder="77002"
                  aria-invalid={zip.length > 0 && !zipOk ? true : undefined}
                  className="max-w-40"
                />
                {zip.length > 0 && !zipOk && <p className="text-stop text-xs">{t("setup.zipInvalid")}</p>}
              </div>
            )}
          </Question>

          {isExport && (
            <Question n={2} title={t("setup.q2")}>
              <Options
                name={`${uid}-vat`}
                value={vat}
                onChange={(v) => setVat(v as "yes" | "no")}
                describedBy={`${uid}-tax`}
                options={[
                  { value: "yes", label: t("setup.vatYes"), hint: t("setup.vatYesHint") },
                  { value: "no", label: t("setup.vatNo"), hint: t("setup.vatNoHint") },
                ]}
              />
              <p id={`${uid}-tax`} className="text-muted-foreground text-xs">
                {t("setup.taxNote")}
              </p>
            </Question>
          )}

          <Question n={isExport ? 3 : 2} title={t("setup.q3")}>
            <Options
              name={`${uid}-licence`}
              value={licence}
              onChange={(v) => setLicence(v as "yes" | "no")}
              options={[
                { value: "yes", label: t("setup.licenceYes"), hint: t("setup.licenceYesHint") },
                { value: "no", label: t("setup.licenceNo"), hint: t("setup.licenceNoHint") },
              ]}
            />
            {licence === "no" && (
              <div className="space-y-1.5">
                <Label htmlFor={`${uid}-broker`}>{t("setup.brokerFee")}</Label>
                <Input
                  id={`${uid}-broker`}
                  name="brokerFee"
                  inputMode="numeric"
                  value={brokerFee}
                  onChange={(e) => setBrokerFee(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="400"
                  className="max-w-40"
                />
              </div>
            )}
          </Question>

          {error && (
            <p role="alert" className="text-stop text-sm">
              {error}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={!ready || busy} data-testid="setup-save">
              {busy && <Loader2Icon className="animate-spin" />} {busy ? t("setup.saving") : t("setup.save")}
            </Button>
            <Button type="button" variant="ghost" asChild>
              <Link href="/app">{t("setup.skip")}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
