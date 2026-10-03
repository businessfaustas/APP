import type { Metadata } from "next";

import { BillingClient } from "@/components/billing/billing-client";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { PLANS } from "@/lib/billing/plans";
import { features } from "@/lib/config/env";
import { prisma } from "@/lib/db/prisma";
import { INTL_LOCALE } from "@/lib/i18n/locales";
import { getT } from "@/lib/i18n/server";
import { daysAgo, formatDate, formatDateTime } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("billing.title") };
}

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const t = await getT();
  const intl = INTL_LOCALE[t.locale];
  const [account, ledger, used] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id }, select: { stripeCustomerId: true, creditsResetAt: true } }),
    prisma.creditLedger.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 12 }),
    prisma.creditLedger.count({
      where: { userId: user.id, reason: "ANALYSIS", createdAt: { gte: daysAgo(30) } },
    }),
  ]);
  return (
    <PageContainer>
      <PageHeader title={t("billing.title")} description={t("billing.body")} />
      {sp.status === "success" && <p className="bg-go-soft rounded-md px-3 py-2 text-sm">{t("billing.success")}</p>}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent>
            <div className="text-muted-foreground text-xs">{t("billing.plan")}</div>
            <div className="text-2xl font-semibold">{t(`pricing.plans.${user.plan}.name`)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="text-muted-foreground text-xs">{t("billing.creditsLeft")}</div>
            <div className="text-2xl font-semibold">{user.creditsRemaining}</div>
            <div className="text-muted-foreground text-xs">
              {t("billing.resets", { n: PLANS[user.plan].monthlyCredits })}
              {account?.creditsResetAt ? t("billing.lastReset", { date: formatDate(account.creditsResetAt, intl) }) : ""}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="text-muted-foreground text-xs">{t("billing.reports30")}</div>
            <div className="text-2xl font-semibold">{used}</div>
          </CardContent>
        </Card>
      </div>
      <BillingClient plan={user.plan} stripeEnabled={features.stripe()} hasCustomer={Boolean(account?.stripeCustomerId)} />
      <Card>
        <CardContent>
          <div className="mb-2 text-sm font-medium">{t("billing.activity")}</div>
          <ul className="divide-y text-sm">
            {ledger.map((l) => (
              <li key={l.id} className="flex justify-between py-1.5">
                <span className="text-muted-foreground">
                  {t.dyn(`billing.reason.${l.reason.replace(/:.*/, "")}`, undefined, l.reason.replace(/_/g, " ").replace(/:.*/, "").toLowerCase())}
                </span>
                <span className="flex gap-4">
                  <span className={l.delta < 0 ? "text-stop" : l.delta > 0 ? "text-go" : "text-muted-foreground"}>{l.delta > 0 ? `+${l.delta}` : l.delta}</span>
                  <span className="text-muted-foreground w-40 text-right text-xs">{formatDateTime(l.createdAt, intl)}</span>
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
