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
import { sourceLabel } from "@/lib/input/urls";
import { cn, formatDateTime, formatUsd } from "@/lib/utils";

export const metadata: Metadata = { title: "History" };

const FILTERS = [
  { key: "all", label: "All" },
  { key: "GO", label: "GO" },
  { key: "BE_CAUTIOUS", label: "Be cautious" },
  { key: "WALK_AWAY", label: "Walk away" },
] as const;

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ verdict?: string; page?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
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
      <PageHeader title="History" description={`${total} report${total === 1 ? "" : "s"}`} />
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? "/app/history" : `/app/history?verdict=${f.key}`}
            className={cn(
              "rounded-full border px-3 py-1 text-xs",
              (verdict ?? "all") === f.key ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={<HistoryIcon />} title="No reports here yet" />
      ) : (
        <Card>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead className="text-right">Max bid</TableHead>
                  <TableHead className="text-right">Exp. profit</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="text-right">Date</TableHead>
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
                        {l?.primaryDamage && <div className="text-muted-foreground text-xs">{l.primaryDamage.toLowerCase()}</div>}
                      </TableCell>
                      <TableCell className="text-xs">{l ? `${sourceLabel(l.source)}${l.lotNumber ? ` · ${l.lotNumber}` : ""}` : "—"}</TableCell>
                      <TableCell>
                        {a.status === "COMPLETED" && a.verdict ? (
                          <VerdictBadge verdict={a.verdict} />
                        ) : a.status === "FAILED" ? (
                          <Badge variant="stop">Failed</Badge>
                        ) : a.currentStep === "NEEDS_INPUT" ? (
                          <Badge variant="caution">Needs details</Badge>
                        ) : (
                          <Badge variant="info">Running</Badge>
                        )}
                      </TableCell>
                      <TableCell className="num text-right">{formatUsd(a.maxBid)}</TableCell>
                      <TableCell className="num text-right">{formatUsd(a.expectedProfit)}</TableCell>
                      <TableCell className="num text-right">{a.dealScore ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-right text-xs">{formatDateTime(a.createdAt)}</TableCell>
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
              Previous
            </Link>
          )}
          <span className="text-muted-foreground">
            Page {page} of {pages}
          </span>
          {page < pages && (
            <Link className="underline" href={`/app/history?${verdict ? `verdict=${verdict}&` : ""}page=${page + 1}`}>
              Next
            </Link>
          )}
        </div>
      )}
    </PageContainer>
  );
}
