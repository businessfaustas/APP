import { CalendarClockIcon, FileSearchIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AnalyzeBar } from "@/components/input/analyze-bar";
import { EmptyState, PageContainer } from "@/components/page-header";
import { VerdictBadge } from "@/components/report/verdict-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { DEMO_LOTS } from "@/lib/config/demo";
import { features } from "@/lib/config/env";
import { prisma } from "@/lib/db/prisma";
import type { NormalizedListing } from "@/lib/domain/schemas";
import { formatCountdown, formatDate, formatUsd } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

function title(l: NormalizedListing | null, fallback: string): string {
  if (!l) return fallback;
  return [l.year, l.make, l.model].filter(Boolean).join(" ") || fallback;
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ input?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const [recent, watch, counts] = await Promise.all([
    prisma.analysis.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, status: true, verdict: true, maxBid: true, dealScore: true, createdAt: true, listingSnapshot: true, inputValue: true, currentStep: true },
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
      <section className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">What are you bidding on?</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Paste a listing and get your verdict, max bid, repair estimate and profit in about a minute.
          </p>
        </div>
        <AnalyzeBar demoLots={features.demoMode() ? DEMO_LOTS : []} initialInput={sp.input ?? ""} />
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Recent analyses</CardTitle>
            <Link href="/app/history" className="text-xs text-muted-foreground hover:text-foreground">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <EmptyState icon={<FileSearchIcon />} title="No analyses yet">
                Paste your first listing above{features.demoMode() ? " or try a demo lot" : ""}.
              </EmptyState>
            ) : (
              <ul className="divide-y">
                {recent.map((a) => {
                  const l = a.listingSnapshot as NormalizedListing | null;
                  return (
                    <li key={a.id}>
                      <Link href={`/app/analyses/${a.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:opacity-80">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{title(l, a.inputValue)}</div>
                          <div className="text-xs text-muted-foreground">
                            {l?.primaryDamage ? `${l.primaryDamage} · ` : ""}
                            {formatDate(a.createdAt)}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          {a.status === "COMPLETED" && a.verdict ? (
                            <>
                              <span className="num hidden text-sm sm:inline">{a.maxBid !== null ? `≤ ${formatUsd(a.maxBid)}` : "—"}</span>
                              <VerdictBadge verdict={a.verdict} />
                            </>
                          ) : a.status === "FAILED" ? (
                            <Badge variant="stop">Failed</Badge>
                          ) : a.currentStep === "NEEDS_INPUT" ? (
                            <Badge variant="caution">Needs details</Badge>
                          ) : (
                            <Badge variant="info">Running…</Badge>
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
            <CardHeader>
              <CardTitle className="text-base">Your numbers</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="num text-2xl font-semibold">{total}</div>
                <div className="text-xs text-muted-foreground">Reports</div>
              </div>
              <div>
                <div className="num text-2xl font-semibold text-go">{goCount}</div>
                <div className="text-xs text-muted-foreground">GO deals</div>
              </div>
              <div>
                <div className="num text-2xl font-semibold">{user.creditsRemaining}</div>
                <div className="text-xs text-muted-foreground">Credits</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Upcoming sales</CardTitle>
              <Link href="/app/watchlist" className="text-xs text-muted-foreground hover:text-foreground">
                Watchlist
              </Link>
            </CardHeader>
            <CardContent>
              {watch.length === 0 ? (
                <p className="text-sm text-muted-foreground">Save lots from a report to see their sale countdowns here.</p>
              ) : (
                <ul className="space-y-2.5">
                  {watch.map((w) => (
                    <li key={w.id}>
                      <Link href={w.analysisId ? `/app/analyses/${w.analysisId}` : "/app/watchlist"} className="flex items-center justify-between gap-2 text-sm">
                        <span className="truncate">{[w.listing.year, w.listing.make, w.listing.model].filter(Boolean).join(" ")}</span>
                        <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                          <CalendarClockIcon className="size-3.5" />
                          {formatCountdown(w.listing.saleDate)}
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
