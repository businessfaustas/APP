"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { acquisitionAt, buildCalc } from "@/lib/calc";
import type { ScenarioKey } from "@/lib/calc/types";
import { cn, formatBps, formatUsd } from "@/lib/utils";

import { CostWaterfall } from "./charts";
import { useReport } from "./report-context";

const KEYS: ScenarioKey[] = ["best", "expected", "worst"];

export function CostsTab() {
  const { calc, view, lineItems, assumptions } = useReport();
  if (!calc || !view.base) return null;
  const { input, settings } = buildCalc({ ...view.base, lineItems }, assumptions);
  const acq = acquisitionAt(input, settings, calc.maxBid ?? 0);
  const s = calc.scenarios;
  type Row = { label: string; values: (k: ScenarioKey) => number | null; bold?: boolean; signed?: boolean };
  const rows: Row[] = [
    { label: "Resale value", values: (k) => s[k].resale, bold: true },
    { label: "Winning bid (max)", values: () => -acq.bid },
    { label: "Auction fees", values: () => -acq.fees.total },
    ...(acq.brokerFee ? [{ label: "Broker fee", values: () => -acq.brokerFee }] : []),
    ...(acq.salesTax ? [{ label: "Sales tax", values: () => -acq.salesTax }] : []),
    ...(acq.duty || acq.vat || acq.marineInsurance ? [{ label: "Duty, VAT & insurance", values: () => -(acq.duty + acq.vat + acq.marineInsurance) }] : []),
    { label: "Repairs (incl. contingency)", values: (k) => -s[k].repair },
    { label: assumptions.exitStrategy === "EXPORT" ? "Export logistics" : "Transport", values: (k) => -s[k].logistics },
    { label: "Title, inspection & storage", values: (k) => -s[k].admin },
    { label: "Holding", values: (k) => -s[k].holding },
    { label: "Selling costs", values: (k) => -s[k].selling },
    ...(s.expected.extras ? [{ label: "Other costs", values: (k: ScenarioKey) => -s[k].extras }] : []),
    { label: "Net profit", values: (k) => s[k].profitAtMaxBid, bold: true, signed: true },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Where the money goes</CardTitle>
          <p className="text-xs text-muted-foreground">Expected case, if you win at your max bid of {formatUsd(calc.maxBid ?? 0)}.</p>
        </CardHeader>
        <CardContent>
          <CostWaterfall rows={calc.waterfall} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scenarios at your max bid</CardTitle>
        </CardHeader>
        <CardContent>
          <Table data-testid="scenario-table">
            <TableHeader>
              <TableRow>
                <TableHead />
                <TableHead className="text-right">Best</TableHead>
                <TableHead className="text-right">Expected</TableHead>
                <TableHead className="text-right">Worst</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="num">
              {rows.map((r) => (
                <TableRow key={r.label} className={cn(r.bold && "font-semibold")}>
                  <TableCell>{r.label}</TableCell>
                  {KEYS.map((k) => {
                    const v = r.values(k);
                    return (
                      <TableCell key={k} className={cn("text-right", r.signed && (v ?? 0) < 0 && "text-stop")}>
                        {formatUsd(v)}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
              <TableRow>
                <TableCell>ROI</TableCell>
                {KEYS.map((k) => (
                  <TableCell key={k} className="text-right">
                    {formatBps(s[k].roiAtMaxBidBps)}
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Auction fees at {formatUsd(calc.maxBid ?? 0)}</CardTitle>
          <p className="text-xs text-muted-foreground">
            {input.feeSchedule.name}
            {input.feeSchedule.isPlaceholder ? " — approximate placeholder table, verify on the auction's fee page." : ""}
          </p>
        </CardHeader>
        <CardContent>
          <dl className="num space-y-1.5 text-sm">
            {acq.fees.lines.map((l) => (
              <div key={l.label} className="flex justify-between">
                <dt className="text-muted-foreground">{l.label}</dt>
                <dd>{formatUsd(l.amount)}</dd>
              </div>
            ))}
            <div className="flex justify-between border-t pt-1.5 font-semibold">
              <dt>Total fees</dt>
              <dd>{formatUsd(acq.fees.total)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">
            Bids: comfort {formatUsd(calc.comfortBid)} (worst case breaks even) · max {formatUsd(calc.maxBid)} (hits your {formatUsd(calc.targetProfit)} target) ·
            break-even {formatUsd(calc.breakEvenBid)} (expected case breaks even).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
