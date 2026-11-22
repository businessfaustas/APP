"use client";

import { CheckIcon, Loader2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FEATURED_PACK, PACK_ORDER, PACKS, PLANS, pricePerReport, type PackId, type PlanId } from "@/lib/billing/plans";
import { useT } from "@/lib/i18n/client";
import { INTL_LOCALE } from "@/lib/i18n/locales";
import { rich } from "@/lib/i18n/rich";
import { cn, formatEur } from "@/lib/utils";

async function go(path: string, body?: unknown): Promise<void> {
  const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const data = (await res.json()) as { url?: string; error?: string };
  if (!res.ok || !data.url) throw new Error(data.error ?? "");
  window.location.href = data.url;
}

export function BillingClient({ plan, stripeEnabled, hasCustomer }: { plan: PlanId; stripeEnabled: boolean; hasCustomer: boolean }) {
  const t = useT();
  const intl = INTL_LOCALE[t.locale];
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : t("billing.error"));
      setBusy(null);
    }
  };
  return (
    <div className="space-y-5">
      {!stripeEnabled && (
        <p className="bg-muted text-muted-foreground rounded-md px-3 py-2 text-sm">{rich(t("billing.notConfigured"), { vars: <code>STRIPE_*</code> })}</p>
      )}
      <div className="space-y-3">
        <div>
          <div className="font-medium">{t("billing.needMore")}</div>
          <div className="text-muted-foreground text-sm">{t("billing.packsBody")}</div>
        </div>
        <div className="grid gap-4 md:grid-cols-3" data-testid="pack-grid">
          {PACK_ORDER.map((id: PackId) => {
            const p = PACKS[id];
            const featured = id === FEATURED_PACK;
            return (
              <Card key={id} className={cn(featured && "ring-primary ring-2")}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {t("pricing.packName", { n: p.reports })} {featured && <Badge>{t("pricing.bestValue")}</Badge>}
                  </CardTitle>
                  <CardDescription>{t("pricing.perCar", { price: formatEur(pricePerReport(p), intl) })}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-3xl font-semibold">{formatEur(p.price, intl)}</div>
                  <Button
                    className="w-full"
                    variant={featured ? "default" : "outline"}
                    disabled={!stripeEnabled || busy !== null}
                    onClick={() => void run(id, () => go("/api/stripe/checkout", { item: id }))}
                  >
                    {busy === id && <Loader2Icon className="animate-spin" />} {t("billing.buyPack", { n: p.reports })}
                  </Button>
                  <p className="text-muted-foreground text-xs leading-relaxed">{t("renewal.pack", { price: formatEur(p.price, intl) })}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {(Object.keys(PLANS) as PlanId[]).map((id) => {
          const p = PLANS[id];
          const current = id === plan;
          const name = t(`pricing.plans.${id}.name`);
          const features = (["f1", "f2", "f3", "f4", "f5"] as const).map((k) => t(`pricing.plans.${id}.${k}`)).filter(Boolean);
          return (
            <Card key={id} className={cn(current && "ring-primary ring-2")}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {name} {current && <Badge>{t("billing.current")}</Badge>}
                </CardTitle>
                <CardDescription>{t(`pricing.plans.${id}.tagline`)}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="text-3xl font-semibold">{formatEur(p.priceMonthly, intl)}</span>
                  <span className="text-muted-foreground text-sm"> {t("common.perMonth")}</span>
                </div>
                <ul className="space-y-1.5 text-sm">
                  {features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <CheckIcon className="text-go mt-0.5 size-4 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                {id !== "FREE" && !current && (
                  <Button
                    className="w-full"
                    disabled={!stripeEnabled || busy !== null}
                    onClick={() => void run(id, () => go("/api/stripe/checkout", { item: id }))}
                  >
                    {busy === id && <Loader2Icon className="animate-spin" />} {t("billing.upgradeTo", { plan: name })}
                  </Button>
                )}
                {id !== "FREE" && !current && (
                  <p className="text-muted-foreground text-xs leading-relaxed">{t("renewal.monthly", { price: formatEur(p.priceMonthly, intl) })}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      {hasCustomer && (
        <div className="flex justify-end">
          <Button variant="ghost" disabled={!stripeEnabled || busy !== null} onClick={() => void run("portal", () => go("/api/stripe/portal"))}>
            {t("billing.manage")}
          </Button>
        </div>
      )}
    </div>
  );
}
