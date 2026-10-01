import { CheckIcon } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CREDIT_PACK, PLANS, type PlanId } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";

const ORDER: PlanId[] = ["FREE", "PRO", "BUSINESS"];

export function PricingTable() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {ORDER.map((id) => {
          const p = PLANS[id];
          const featured = id === "PRO";
          return (
            <Card key={id} className={cn("relative flex flex-col", featured && "ring-primary ring-2")}>
              {featured && <Badge className="absolute -top-2.5 left-6">Most popular</Badge>}
              <CardHeader>
                <CardTitle className="text-lg">{p.name}</CardTitle>
                <CardDescription>{p.tagline}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-5">
                <div>
                  <span className="text-4xl font-semibold tracking-tight">${p.priceMonthly}</span>
                  <span className="text-muted-foreground text-sm"> / month</span>
                  <div className="text-muted-foreground mt-1 text-sm">{p.monthlyCredits} reports included</div>
                </div>
                <ul className="flex-1 space-y-2 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <CheckIcon className="text-primary mt-0.5 size-4 shrink-0" aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button asChild variant={featured ? "default" : "outline"} className="w-full">
                  <Link href={id === "FREE" ? "/app" : "/app/billing"}>{id === "FREE" ? "Start free" : `Choose ${p.name}`}</Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <p className="text-muted-foreground text-center text-sm">
        Need a few more? Top up any plan with {CREDIT_PACK.credits} reports for ${CREDIT_PACK.price}. One report = one lot analyzed; re-running the what-if
        sliders on a report is free.
      </p>
    </div>
  );
}
