"use client";

import { CheckIcon, Loader2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CREDIT_PACK, PLANS, type PlanId } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";

async function go(path: string, body?: unknown): Promise<void> {
  const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const data = (await res.json()) as { url?: string; error?: string };
  if (!res.ok || !data.url) throw new Error(data.error ?? "Billing error");
  window.location.href = data.url;
}

export function BillingClient({ plan, stripeEnabled, hasCustomer }: { plan: PlanId; stripeEnabled: boolean; hasCustomer: boolean }) {
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Billing error");
      setBusy(null);
    }
  };
  return (
    <div className="space-y-5">
      {!stripeEnabled && (
        <p className="bg-muted text-muted-foreground rounded-md px-3 py-2 text-sm">
          Billing isn&apos;t configured on this server (set the <code>STRIPE_*</code> environment variables). Plans are shown for reference.
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        {(Object.keys(PLANS) as PlanId[]).map((id) => {
          const p = PLANS[id];
          const current = id === plan;
          return (
            <Card key={id} className={cn(current && "ring-primary ring-2")}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {p.name} {current && <Badge>Current</Badge>}
                </CardTitle>
                <CardDescription>{p.tagline}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="text-3xl font-semibold">${p.priceMonthly}</span>
                  <span className="text-muted-foreground text-sm"> / month</span>
                </div>
                <ul className="space-y-1.5 text-sm">
                  {p.features.map((f) => (
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
                    {busy === id && <Loader2Icon className="animate-spin" />} Upgrade to {p.name}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      <Card>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-medium">Need a few more reports?</div>
            <div className="text-muted-foreground text-sm">
              {CREDIT_PACK.credits} extra reports for ${CREDIT_PACK.price}. They never expire.
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={!stripeEnabled || busy !== null}
              onClick={() => void run("credits", () => go("/api/stripe/checkout", { item: "CREDITS_10" }))}
            >
              {busy === "credits" && <Loader2Icon className="animate-spin" />} Buy {CREDIT_PACK.credits} credits
            </Button>
            {hasCustomer && (
              <Button variant="ghost" disabled={!stripeEnabled || busy !== null} onClick={() => void run("portal", () => go("/api/stripe/portal"))}>
                Manage subscription
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
