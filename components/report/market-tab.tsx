"use client";

import { ExternalLinkIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useT } from "@/lib/i18n/client";
import { trText } from "@/lib/i18n/generated";
import { median } from "@/lib/providers/market/stats";
import { formatBps, formatNumber, formatUsd } from "@/lib/utils";

import { CompsScatter } from "./charts";
import { useReport } from "./report-context";

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
      {sub && <div className="text-muted-foreground text-xs">{sub}</div>}
    </div>
  );
}

export function MarketTab() {
  const { view, calc, assumptions } = useReport();
  const t = useT();
  const m = view.market;
  if (!m) return null;
  const mvExpected = assumptions.mvCleanOverride ?? m.mvClean.expected;
  const medianAsking = m.comps.length ? Math.round(median(m.comps.map((c) => c.price))) : null;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label={t("report.cleanExpected")}
          value={formatUsd(mvExpected)}
          sub={t("report.range", { low: formatUsd(m.mvClean.worst), high: formatUsd(m.mvClean.best) })}
        />
        <Stat
          label={assumptions.exitStrategy === "EXPORT" ? t("report.resaleExport") : t("report.rebuiltResale")}
          value={formatUsd(calc?.scenarios.expected.resale)}
          sub={assumptions.exitStrategy === "EXPORT" ? t("report.destinationValue") : t("report.ofClean", { pct: formatBps(assumptions.rebuiltFactorBps, 0) })}
        />
        <Stat
          label={t("report.medianDays")}
          value={m.medianDaysOnMarket !== null ? t("report.days", { n: m.medianDaysOnMarket }) : "—"}
          sub={t("report.holdingAssumed", { n: assumptions.holdingDaysExpected })}
        />
        <Stat label={t("report.comps")} value={String(m.compsCount)} sub={t("report.confidence", { pct: Math.round(m.confidence * 100) })} />
      </div>
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">{t("report.comparableListings")}</CardTitle>
          <Badge variant={m.isDemo ? "info" : "outline"}>{trText(t, m.provider)}</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {m.comps.length > 0 ? (
            <>
              <CompsScatter comps={m.comps} subjectMileage={view.listing?.odometer ?? null} medianAsking={medianAsking} />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">{t("report.asking")}</TableHead>
                    <TableHead className="text-right">{t("report.adjusted")}</TableHead>
                    <TableHead className="text-right">{t("report.miles")}</TableHead>
                    <TableHead>{t("report.location")}</TableHead>
                    <TableHead className="text-right">{t("report.daysListed")}</TableHead>
                    <TableHead>{t("report.seller")}</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody className="num">
                  {m.comps.map((c, i) => (
                    <TableRow key={`${c.price}-${c.mileage}-${i}`}>
                      <TableCell className="text-right">{formatUsd(c.price)}</TableCell>
                      <TableCell className="text-muted-foreground text-right">{formatUsd(c.adjustedPrice)}</TableCell>
                      <TableCell className="text-right">{formatNumber(c.mileage)}</TableCell>
                      <TableCell>
                        {[c.city, c.state].filter(Boolean).join(", ") || "—"}
                        {c.distanceMiles !== null ? <span className="text-muted-foreground"> · {c.distanceMiles} mi</span> : null}
                      </TableCell>
                      <TableCell className="text-right">{c.daysOnMarket ?? "—"}</TableCell>
                      <TableCell className="capitalize">{trText(t, c.sellerType)}</TableCell>
                      <TableCell>
                        {c.url && (
                          <a
                            href={c.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={t("report.openListing")}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <ExternalLinkIcon className="size-3.5" />
                          </a>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">{t("report.noComps", { provider: trText(t, m.provider).toLowerCase() })}</p>
          )}
          <ul className="text-muted-foreground space-y-1 text-xs">
            {m.notes.map((n) => (
              <li key={n}>{trText(t, n)}</li>
            ))}
            <li>{t("report.compsMethod")}</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
