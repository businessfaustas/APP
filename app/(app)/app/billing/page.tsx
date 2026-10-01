import type { Metadata } from "next";

import { BillingClient } from "@/components/billing/billing-client";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { PLANS } from "@/lib/billing/plans";
import { features } from "@/lib/config/env";
import { prisma } from "@/lib/db/prisma";
import { daysAgo, formatDate, formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Billing" };

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const [account, ledger, used] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id }, select: { stripeCustomerId: true, creditsResetAt: true } }),
    prisma.creditLedger.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 12 }),
    prisma.creditLedger.count({
      where: { userId: user.id, reason: "ANALYSIS", createdAt: { gte: daysAgo(30) } },
    }),
  ]);
  return (
    <PageContainer>
      <PageHeader title="Billing" description="One credit = one report. Moving sliders and re-opening reports is always free." />
      {sp.status === "success" && <p className="bg-go-soft rounded-md px-3 py-2 text-sm">Payment received — thank you! Your plan and credits are updated.</p>}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent>
            <div className="text-muted-foreground text-xs">Plan</div>
            <div className="text-2xl font-semibold">{PLANS[user.plan].name}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="text-muted-foreground text-xs">Credits left</div>
            <div className="text-2xl font-semibold">{user.creditsRemaining}</div>
            <div className="text-muted-foreground text-xs">
              Resets to {PLANS[user.plan].monthlyCredits} monthly{account?.creditsResetAt ? ` · last reset ${formatDate(account.creditsResetAt)}` : ""}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="text-muted-foreground text-xs">Reports in the last 30 days</div>
            <div className="text-2xl font-semibold">{used}</div>
          </CardContent>
        </Card>
      </div>
      <BillingClient plan={user.plan} stripeEnabled={features.stripe()} hasCustomer={Boolean(account?.stripeCustomerId)} />
      <Card>
        <CardContent>
          <div className="mb-2 text-sm font-medium">Recent credit activity</div>
          <ul className="divide-y text-sm">
            {ledger.map((l) => (
              <li key={l.id} className="flex justify-between py-1.5">
                <span className="text-muted-foreground">{l.reason.replace(/_/g, " ").replace(/:.*/, "").toLowerCase()}</span>
                <span className="flex gap-4">
                  <span className={l.delta < 0 ? "text-stop" : l.delta > 0 ? "text-go" : "text-muted-foreground"}>{l.delta > 0 ? `+${l.delta}` : l.delta}</span>
                  <span className="text-muted-foreground w-40 text-right text-xs">{formatDateTime(l.createdAt)}</span>
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
