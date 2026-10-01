"use client";

import { ExternalLinkIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  const m = view.market;
  if (!m) return null;
  const mvExpected = assumptions.mvCleanOverride ?? m.mvClean.expected;
  const medianAsking = m.comps.length ? Math.round(median(m.comps.map((c) => c.price))) : null;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Clean value — expected" value={formatUsd(mvExpected)} sub={`Range ${formatUsd(m.mvClean.worst)} – ${formatUsd(m.mvClean.best)}`} />
        <Stat
          label={assumptions.exitStrategy === "EXPORT" ? "Resale (export)" : "Rebuilt-title resale"}
          value={formatUsd(calc?.scenarios.expected.resale)}
          sub={assumptions.exitStrategy === "EXPORT" ? "Destination value" : `${formatBps(assumptions.rebuiltFactorBps, 0)} of clean`}
        />
        <Stat
          label="Median days to sell"
          value={m.medianDaysOnMarket !== null ? `${m.medianDaysOnMarket} days` : "—"}
          sub={`Holding ${assumptions.holdingDaysExpected} days assumed`}
        />
        <Stat label="Comps" value={String(m.compsCount)} sub={`Confidence ${Math.round(m.confidence * 100)}%`} />
      </div>
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Comparable listings</CardTitle>
          <Badge variant={m.isDemo ? "info" : "outline"}>{m.provider}</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {m.comps.length > 0 ? (
            <>
              <CompsScatter comps={m.comps} subjectMileage={view.listing?.odometer ?? null} medianAsking={medianAsking} />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">Asking</TableHead>
                    <TableHead className="text-right">Adjusted</TableHead>
                    <TableHead className="text-right">Miles</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Days listed</TableHead>
                    <TableHead>Seller</TableHead>
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
                      <TableCell className="capitalize">{c.sellerType}</TableCell>
                      <TableCell>
                        {c.url && (
                          <a
                            href={c.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Open listing"
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
            <p className="text-muted-foreground text-sm">No individual comps — the value comes from {m.provider.toLowerCase()}.</p>
          )}
          <ul className="text-muted-foreground space-y-1 text-xs">
            {m.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
            <li>
              Clean values are asking prices adjusted to this car&apos;s mileage, then multiplied by your list-to-sale ratio. Best = 75th percentile, worst =
              25th.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
