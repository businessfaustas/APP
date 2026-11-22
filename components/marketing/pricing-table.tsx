import { CheckIcon } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FEATURED_PACK, PACK_ORDER, PACKS, PLANS, pricePerReport, type PlanId } from "@/lib/billing/plans";
import { INTL_LOCALE } from "@/lib/i18n/locales";
import { getT } from "@/lib/i18n/server";
import { cn, formatEur } from "@/lib/utils";

const PLAN_ORDER: PlanId[] = ["FREE", "PRO", "BUSINESS"];
const FEATURE_KEYS = ["f1", "f2", "f3", "f4", "f5"] as const;
const PACK_FEATURES = ["packF1", "packF2", "packF3"] as const;

/** Share saved per car against the smallest pack, as a whole percent. */
function savingPct(id: (typeof PACK_ORDER)[number]): number {
  const base = pricePerReport(PACKS[PACK_ORDER[0]!]);
  return Math.round((1 - pricePerReport(PACKS[id]) / base) * 100);
}

export async function PricingTable() {
  const t = await getT();
  const intl = INTL_LOCALE[t.locale];
  return (
    <div className="space-y-12">
      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-3" data-testid="pack-grid">
          {PACK_ORDER.map((id) => {
            const p = PACKS[id];
            const featured = id === FEATURED_PACK;
            const save = savingPct(id);
            return (
              <Card key={id} className={cn("relative flex flex-col", featured && "ring-primary ring-2")} data-testid={`pack-${p.reports}`}>
                {featured && <Badge className="absolute -top-2.5 left-6">{t("pricing.bestValue")}</Badge>}
                <CardHeader>
                  <CardTitle className="text-lg">{t("pricing.packName", { n: p.reports })}</CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    {t("pricing.perCar", { price: formatEur(pricePerReport(p), intl) })}
                    {save > 0 && <Badge variant="go">{t("pricing.save", { pct: save })}</Badge>}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-5">
                  <div className="text-4xl font-semibold tracking-tight">{formatEur(p.price, intl)}</div>
                  <ul className="flex-1 space-y-2 text-sm">
                    {PACK_FEATURES.map((k) => (
                      <li key={k} className="flex gap-2">
                        <CheckIcon className="text-primary mt-0.5 size-4 shrink-0" aria-hidden="true" />
                        {t(`pricing.${k}`)}
                      </li>
                    ))}
                  </ul>
                  <Button asChild variant={featured ? "default" : "outline"} className="w-full">
                    <Link href="/app/billing">{t("pricing.buyPack", { n: p.reports })}</Link>
                  </Button>
                  <p className="text-muted-foreground text-xs leading-relaxed">{t("renewal.pack", { price: formatEur(p.price, intl) })}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <p className="text-muted-foreground text-center text-sm">{t("pricing.packsNote")}</p>
        <p className="text-center text-sm">
          <Link href="/app" className="text-primary font-medium underline-offset-4 hover:underline">
            {t("pricing.freeTrial", { n: PLANS.FREE.monthlyCredits })}
          </Link>
        </p>
      </div>

      <div className="space-y-5">
        <div className="space-y-1 text-center">
          <h3 className="text-xl font-semibold tracking-tight">{t("pricing.plansTitle")}</h3>
          <p className="text-muted-foreground text-sm">{t("pricing.plansBody")}</p>
        </div>
        <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-3">
          {PLAN_ORDER.map((id) => {
            const p = PLANS[id];
            const name = t(`pricing.plans.${id}.name`);
            const features = FEATURE_KEYS.map((k) => t(`pricing.plans.${id}.${k}`)).filter(Boolean);
            return (
              <Card key={id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-lg">{name}</CardTitle>
                  <CardDescription>{t(`pricing.plans.${id}.tagline`)}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-5">
                  <div>
                    <span className="text-3xl font-semibold tracking-tight">{formatEur(p.priceMonthly, intl)}</span>
                    <span className="text-muted-foreground text-sm"> {t("common.perMonth")}</span>
                    <div className="text-muted-foreground mt-1 text-sm">{t("pricing.reportsIncluded", { n: p.monthlyCredits })}</div>
                  </div>
                  <ul className="flex-1 space-y-2 text-sm">
                    {features.map((f) => (
                      <li key={f} className="flex gap-2">
                        <CheckIcon className="text-primary mt-0.5 size-4 shrink-0" aria-hidden="true" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button asChild variant="outline" className="w-full">
                    <Link href={id === "FREE" ? "/app" : "/app/billing"}>{id === "FREE" ? t("pricing.startFree") : t("pricing.choose", { plan: name })}</Link>
                  </Button>
                  {id !== "FREE" && (
                    <p className="text-muted-foreground text-xs leading-relaxed">{t("renewal.monthly", { price: formatEur(p.priceMonthly, intl) })}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
