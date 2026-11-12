import { CalendarClockIcon, CircleCheckIcon, CircleDollarSignIcon, FileSearchIcon, FileTextIcon, GaugeIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { HeroScan } from "@/components/dashboard/hero-scan";
import { ActivityChart, KpiTile, LotCard, VerdictMix, type LotCardData } from "@/components/dashboard/widgets";
import { AnalyzeBar } from "@/components/input/analyze-bar";
import { EmptyState, PageContainer } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { lotVisual, photoUrl } from "@/lib/analysis/visual";
import { requireUser } from "@/lib/auth/session";
import { DEMO_LOTS } from "@/lib/config/demo";
import { features } from "@/lib/config/env";
import { prisma } from "@/lib/db/prisma";
import type { DamageAssessment, NormalizedListing, VehicleInfo } from "@/lib/domain/schemas";
import { countdownLabel, damageLabel } from "@/lib/i18n/labels";
import { INTL_LOCALE } from "@/lib/i18n/locales";
import { getT } from "@/lib/i18n/server";
import { formatBps, formatDate } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("dash.title") };
}

function title(l: NormalizedListing | null, fallback: string): string {
  if (!l) return fallback;
  return [l.year, l.make, l.model].filter(Boolean).join(" ") || fallback;
}

const DAY_MS = 86_400_000;

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ input?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const t = await getT();
  const intl = INTL_LOCALE[t.locale];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const since = new Date(today.getTime() - 13 * DAY_MS);
  const completed = { userId: user.id, status: "COMPLETED" as const };

  const [recent, watch, counts, avg, goProfit, lastDays] = await Promise.all([
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
        vehicleInfo: true,
        damage: true,
        inputValue: true,
        currentStep: true,
        listing: { select: { photos: { orderBy: { position: "asc" }, take: 1, select: { id: true, originalUrl: true, storagePath: true } } } },
      },
    }),
    prisma.watchlistItem.findMany({
      where: { userId: user.id, listing: { saleDate: { gte: new Date() } } },
      include: { listing: true },
      orderBy: { listing: { saleDate: "asc" } },
      take: 5,
    }),
    prisma.analysis.groupBy({ by: ["verdict"], where: completed, _count: true }),
    prisma.analysis.aggregate({ where: completed, _avg: { dealScore: true } }),
    prisma.analysis.aggregate({ where: { ...completed, verdict: "GO" }, _sum: { expectedProfit: true } }),
    prisma.analysis.findMany({ where: { userId: user.id, createdAt: { gte: since } }, select: { createdAt: true } }),
  ]);
  const total = counts.reduce((a, c) => a + c._count, 0);
  const byVerdict = Object.fromEntries(counts.filter((c) => c.verdict).map((c) => [c.verdict, c._count])) as Partial<
    Record<"GO" | "BE_CAUTIOUS" | "WALK_AWAY", number>
  >;
  const goCount = byVerdict.GO ?? 0;
  const avgScore = avg._avg.dealScore === null ? null : Math.round(avg._avg.dealScore);

  const dayFmt = new Intl.DateTimeFormat(intl, { month: "short", day: "numeric", timeZone: "UTC" });
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(since.getTime() + i * DAY_MS);
    const key = d.toISOString().slice(0, 10);
    return { date: key, label: dayFmt.format(d), count: lastDays.filter((a) => a.createdAt.toISOString().slice(0, 10) === key).length };
  });
  const recentDays = days.reduce((a, d) => a + d.count, 0);

  const lots: LotCardData[] = recent.map((a) => {
    const l = a.listingSnapshot as NormalizedListing | null;
    return {
      id: a.id,
      title: title(l, a.inputValue),
      meta: [l?.primaryDamage ? damageLabel(t, l.primaryDamage) : null, formatDate(a.createdAt, intl)].filter(Boolean).join(" · "),
      status: a.status,
      needsInput: a.currentStep === "NEEDS_INPUT",
      verdict: a.verdict,
      maxBid: a.maxBid,
      dealScore: a.dealScore,
      visual: lotVisual({
        listing: l,
        vehicle: a.vehicleInfo as VehicleInfo | null,
        damage: a.damage as DamageAssessment | null,
        verdict: a.verdict,
        photo: photoUrl(a.listing?.photos[0]),
      }),
    };
  });

  return (
    <PageContainer>
      <section className="brand-glow bg-card relative overflow-hidden rounded-3xl border p-5 sm:p-8">
        <div className="grid items-center gap-6 lg:grid-cols-[1.25fr_1fr]">
          <div className="space-y-5">
            <div className="rise">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("dash.heading")}</h1>
              <p className="text-muted-foreground mt-2 max-w-xl">{t("dash.body")}</p>
            </div>
            <div className="rise" style={{ ["--i" as string]: 1 }}>
              <AnalyzeBar demoLots={features.demoMode() ? DEMO_LOTS : []} initialInput={sp.input ?? ""} />
            </div>
          </div>
          <HeroScan />
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiTile index={1} icon={<FileTextIcon />} label={t("dash.reports")} value={total} sub={t("dash.recentN", { n: recentDays })} href="/app/history" />
        <KpiTile
          index={2}
          icon={<CircleCheckIcon />}
          label={t("dash.goDeals")}
          value={goCount}
          tone="go"
          sub={total ? t("dash.goShare", { pct: formatBps(Math.round((goCount / total) * 10_000), 0) }) : undefined}
        />
        <KpiTile index={3} icon={<GaugeIcon />} label={t("dash.avgScore")} value={avgScore} sub={t("dash.scoreSub")} />
        <KpiTile
          index={4}
          icon={<CircleDollarSignIcon />}
          label={t("dash.potentialProfit")}
          value={goProfit._sum.expectedProfit ?? 0}
          format="usd"
          tone="go"
          sub={t("dash.profitSub")}
        />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <Card className="rise" style={{ ["--i" as string]: 5 }}>
          <CardHeader>
            <CardTitle>{t("dash.activity")}</CardTitle>
            <CardDescription>{t("dash.activitySub")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityChart days={days} />
          </CardContent>
        </Card>
        <Card className="rise" style={{ ["--i" as string]: 6 }}>
          <CardHeader>
            <CardTitle>{t("dash.verdictMix")}</CardTitle>
            <CardDescription>{t("dash.analysesN", { n: total })}</CardDescription>
          </CardHeader>
          <CardContent>
            <VerdictMix counts={byVerdict} />
          </CardContent>
        </Card>
        <Card className="rise" style={{ ["--i" as string]: 7 }}>
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
              <ul className="-mx-2 space-y-0.5">
                {watch.map((w) => (
                  <li key={w.id}>
                    <Link
                      href={w.analysisId ? `/app/analyses/${w.analysisId}` : "/app/watchlist"}
                      className="hover:bg-muted/70 flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-sm"
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

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">{t("dash.recent")}</h2>
          <Link href="/app/history" className="text-primary text-sm font-medium hover:underline">
            {t("dash.viewAll")}
          </Link>
        </div>
        {lots.length === 0 ? (
          <Card>
            <CardContent>
              <EmptyState icon={<FileSearchIcon />} title={t("dash.noAnalyses")}>
                {features.demoMode() ? t("dash.pasteFirstDemo") : t("dash.pasteFirst")}
              </EmptyState>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {lots.map((lot, i) => (
              <LotCard key={lot.id} lot={lot} index={i} />
            ))}
          </div>
        )}
      </section>
    </PageContainer>
  );
}
