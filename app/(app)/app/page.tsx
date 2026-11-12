import { CalendarClockIcon, CarFrontIcon, FileSearchIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AnalyzeBar } from "@/components/input/analyze-bar";
import { EmptyState, PageContainer } from "@/components/page-header";
import { VerdictBadge } from "@/components/report/verdict-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Stat } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/session";
import { DEMO_LOTS } from "@/lib/config/demo";
import { features } from "@/lib/config/env";
import { prisma } from "@/lib/db/prisma";
import type { NormalizedListing } from "@/lib/domain/schemas";
import { countdownLabel, damageLabel } from "@/lib/i18n/labels";
import { INTL_LOCALE } from "@/lib/i18n/locales";
import { getT } from "@/lib/i18n/server";
import { cn, formatDate, formatUsd } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("dash.title") };
}

function title(l: NormalizedListing | null, fallback: string): string {
  if (!l) return fallback;
  return [l.year, l.make, l.model].filter(Boolean).join(" ") || fallback;
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ input?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const t = await getT();
  const intl = INTL_LOCALE[t.locale];
  const [recent, watch, counts] = await Promise.all([
    prisma.analysis.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        status: true,
        verdict: true,
        maxBid: true,
        dealScore: true,
        createdAt: true,
        listingSnapshot: true,
        inputValue: true,
        currentStep: true,
      },
    }),
    prisma.watchlistItem.findMany({
      where: { userId: user.id, listing: { saleDate: { gte: new Date() } } },
      include: { listing: true },
      orderBy: { listing: { saleDate: "asc" } },
      take: 5,
    }),
    prisma.analysis.groupBy({ by: ["verdict"], where: { userId: user.id, status: "COMPLETED" }, _count: true }),
  ]);
  const total = counts.reduce((a, c) => a + c._count, 0);
  const goCount = counts.find((c) => c.verdict === "GO")?._count ?? 0;

  return (
    <PageContainer>
      <section className="brand-glow bg-card space-y-5 rounded-3xl border p-5 sm:p-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("dash.heading")}</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">{t("dash.body")}</p>
        </div>
        <AnalyzeBar demoLots={features.demoMode() ? DEMO_LOTS : []} initialInput={sp.input ?? ""} />
      </section>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl border p-5">
          <Stat label={t("dash.reports")} value={total} />
        </div>
        <div className="bg-card rounded-2xl border p-5">
          <Stat label={t("dash.goDeals")} value={goCount} tone={goCount > 0 ? "go" : undefined} />
        </div>
        <Link href="/app/billing" className="bg-card hover:border-primary/40 rounded-2xl border p-5 transition-colors">
          <Stat label={t("common.credits")} value={user.creditsRemaining} />
        </Link>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>{t("dash.recent")}</CardTitle>
            <Link href="/app/history" className="text-primary text-sm font-medium hover:underline">
              {t("dash.viewAll")}
            </Link>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <EmptyState icon={<FileSearchIcon />} title={t("dash.noAnalyses")}>
                {features.demoMode() ? t("dash.pasteFirstDemo") : t("dash.pasteFirst")}
              </EmptyState>
            ) : (
              <ul className="-mx-3 space-y-1">
                {recent.map((a) => {
                  const l = a.listingSnapshot as NormalizedListing | null;
                  return (
                    <li key={a.id}>
                      <Link href={`/app/analyses/${a.id}`} className="hover:bg-muted/70 flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors">
                        <span
                          className={cn(
                            "grid size-10 shrink-0 place-items-center rounded-xl",
                            a.verdict === "GO"
                              ? "bg-go-soft text-go"
                              : a.verdict === "BE_CAUTIOUS"
                                ? "bg-caution-soft text-caution"
                                : a.verdict === "WALK_AWAY"
                                  ? "bg-stop-soft text-stop"
                                  : "bg-muted text-muted-foreground",
                          )}
                          aria-hidden="true"
                        >
                          <CarFrontIcon className="size-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{title(l, a.inputValue)}</div>
                          <div className="text-muted-foreground text-xs">
                            {l?.primaryDamage ? `${damageLabel(t, l.primaryDamage)} · ` : ""}
                            {formatDate(a.createdAt, intl)}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          {a.status === "COMPLETED" && a.verdict ? (
                            <>
                              <span className="num hidden text-sm font-medium sm:inline">{a.maxBid !== null ? `≤ ${formatUsd(a.maxBid)}` : "—"}</span>
                              <VerdictBadge verdict={a.verdict} />
                            </>
                          ) : a.status === "FAILED" ? (
                            <Badge variant="stop">{t("dash.failed")}</Badge>
                          ) : a.currentStep === "NEEDS_INPUT" ? (
                            <Badge variant="caution">{t("dash.needsDetails")}</Badge>
                          ) : (
                            <Badge variant="info">{t("dash.running")}</Badge>
                          )}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>{t("dash.upcoming")}</CardTitle>
              <Link href="/app/watchlist" className="text-primary text-sm font-medium hover:underline">
                {t("nav.watchlist")}
              </Link>
            </CardHeader>
            <CardContent>
              {watch.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t("dash.noUpcoming")}</p>
              ) : (
                <ul className="space-y-2.5">
                  {watch.map((w) => (
                    <li key={w.id}>
                      <Link
                        href={w.analysisId ? `/app/analyses/${w.analysisId}` : "/app/watchlist"}
                        className="flex items-center justify-between gap-2 text-sm"
                      >
                        <span className="truncate">{[w.listing.year, w.listing.make, w.listing.model].filter(Boolean).join(" ")}</span>
                        <span className="text-muted-foreground flex shrink-0 items-center gap-1 text-xs">
                          <CalendarClockIcon className="size-3.5" />
                          {countdownLabel(t, w.listing.saleDate)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
