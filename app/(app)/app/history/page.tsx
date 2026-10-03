import { HistoryIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState, PageContainer, PageHeader } from "@/components/page-header";
import { VerdictBadge } from "@/components/report/verdict-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import type { NormalizedListing } from "@/lib/domain/schemas";
import { damageLabel } from "@/lib/i18n/labels";
import { INTL_LOCALE } from "@/lib/i18n/locales";
import { getT } from "@/lib/i18n/server";
import { cn, formatDateTime, formatUsd } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("history.title") };
}

const FILTERS = ["all", "GO", "BE_CAUTIOUS", "WALK_AWAY"] as const;

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ verdict?: string; page?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const t = await getT();
  const VERDICTS = ["GO", "BE_CAUTIOUS", "WALK_AWAY"] as const;
  const verdict = VERDICTS.find((v) => v === sp.verdict);
  const page = Math.max(1, Number(sp.page) || 1);
  const pageSize = 25;
  const where = { userId: user.id, ...(verdict ? { verdict } : {}) };
  const [rows, total] = await Promise.all([
    prisma.analysis.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        status: true,
        verdict: true,
        maxBid: true,
        expectedProfit: true,
        dealScore: true,
        createdAt: true,
        listingSnapshot: true,
        inputValue: true,
        currentStep: true,
      },
    }),
    prisma.analysis.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <PageContainer>
      <PageHeader title={t("history.title")} description={t("history.count", { n: total })} />
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={f === "all" ? "/app/history" : `/app/history?verdict=${f}`}
            className={cn(
              "rounded-full border px-3 py-1 text-xs",
              (verdict ?? "all") === f ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {f === "all" ? t("history.all") : t(`domain.verdict.${f}`)}
          </Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={<HistoryIcon />} title={t("history.empty")} />
      ) : (
        <Card>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("history.vehicle")}</TableHead>
                  <TableHead>{t("history.source")}</TableHead>
                  <TableHead>{t("history.result")}</TableHead>
                  <TableHead className="text-right">{t("history.maxBid")}</TableHead>
                  <TableHead className="text-right">{t("history.expProfit")}</TableHead>
                  <TableHead className="text-right">{t("history.score")}</TableHead>
                  <TableHead className="text-right">{t("history.date")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((a) => {
                  const l = a.listingSnapshot as NormalizedListing | null;
                  return (
                    <TableRow key={a.id}>
                      <TableCell>
                        <Link href={`/app/analyses/${a.id}`} className="font-medium hover:underline">
                          {l ? [l.year, l.make, l.model].filter(Boolean).join(" ") || a.inputValue : a.inputValue}
                        </Link>
                        {l?.primaryDamage && <div className="text-muted-foreground text-xs">{damageLabel(t, l.primaryDamage).toLowerCase()}</div>}
                      </TableCell>
                      <TableCell className="text-xs">{l ? `${t(`domain.source.${l.source}`)}${l.lotNumber ? ` · ${l.lotNumber}` : ""}` : "—"}</TableCell>
                      <TableCell>
                        {a.status === "COMPLETED" && a.verdict ? (
                          <VerdictBadge verdict={a.verdict} />
                        ) : a.status === "FAILED" ? (
                          <Badge variant="stop">{t("dash.failed")}</Badge>
                        ) : a.currentStep === "NEEDS_INPUT" ? (
                          <Badge variant="caution">{t("dash.needsDetails")}</Badge>
                        ) : (
                          <Badge variant="info">{t("history.running")}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="num text-right">{formatUsd(a.maxBid)}</TableCell>
                      <TableCell className="num text-right">{formatUsd(a.expectedProfit)}</TableCell>
                      <TableCell className="num text-right">{a.dealScore ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-right text-xs">{formatDateTime(a.createdAt, INTL_LOCALE[t.locale])}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      {pages > 1 && (
        <div className="flex justify-center gap-2 text-sm">
          {page > 1 && (
            <Link className="underline" href={`/app/history?${verdict ? `verdict=${verdict}&` : ""}page=${page - 1}`}>
              {t("history.previous")}
            </Link>
          )}
          <span className="text-muted-foreground">{t("history.page", { page, pages })}</span>
          {page < pages && (
            <Link className="underline" href={`/app/history?${verdict ? `verdict=${verdict}&` : ""}page=${page + 1}`}>
              {t("history.next")}
            </Link>
          )}
        </div>
      )}
    </PageContainer>
  );
}
