import { CheckIcon } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CREDIT_PACK, PLANS, type PlanId } from "@/lib/billing/plans";
import { getT } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

const ORDER: PlanId[] = ["FREE", "PRO", "BUSINESS"];
const FEATURE_KEYS = ["f1", "f2", "f3", "f4", "f5"] as const;

export async function PricingTable() {
  const t = await getT();
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {ORDER.map((id) => {
          const p = PLANS[id];
          const featured = id === "PRO";
          const name = t(`pricing.plans.${id}.name`);
          const features = FEATURE_KEYS.map((k) => t(`pricing.plans.${id}.${k}`)).filter(Boolean);
          return (
            <Card key={id} className={cn("relative flex flex-col", featured && "ring-primary ring-2")}>
              {featured && <Badge className="absolute -top-2.5 left-6">{t("pricing.mostPopular")}</Badge>}
              <CardHeader>
                <CardTitle className="text-lg">{name}</CardTitle>
                <CardDescription>{t(`pricing.plans.${id}.tagline`)}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-5">
                <div>
                  <span className="text-4xl font-semibold tracking-tight">${p.priceMonthly}</span>
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
                <Button asChild variant={featured ? "default" : "outline"} className="w-full">
                  <Link href={id === "FREE" ? "/app" : "/app/billing"}>{id === "FREE" ? t("pricing.startFree") : t("pricing.choose", { plan: name })}</Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <p className="text-muted-foreground text-center text-sm">{t("pricing.topUp", { credits: CREDIT_PACK.credits, price: CREDIT_PACK.price })}</p>
    </div>
  );
}
