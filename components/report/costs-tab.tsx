"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { acquisitionAt, buildCalc } from "@/lib/calc";
import type { ScenarioKey } from "@/lib/calc/types";
import { useT } from "@/lib/i18n/client";
import { trText } from "@/lib/i18n/generated";
import { cn, formatBps, formatUsd } from "@/lib/utils";

import { CostWaterfall } from "./charts";
import { useReport } from "./report-context";

const KEYS: ScenarioKey[] = ["best", "expected", "worst"];

export function CostsTab() {
  const { calc, view, lineItems, assumptions } = useReport();
  const t = useT();
  if (!calc || !view.base) return null;
  const { input, settings } = buildCalc({ ...view.base, lineItems }, assumptions);
  const acq = acquisitionAt(input, settings, calc.maxBid ?? 0);
  const s = calc.scenarios;
  type Row = { label: string; values: (k: ScenarioKey) => number | null; bold?: boolean; signed?: boolean };
  const rows: Row[] = [
    { label: t("gen.waterfall.resale"), values: (k) => s[k].resale, bold: true },
    { label: t("report.winningBidMax"), values: () => -acq.bid },
    { label: t("gen.waterfall.fees"), values: () => -acq.fees.total },
    ...(acq.brokerFee ? [{ label: t("gen.waterfall.broker"), values: () => -acq.brokerFee }] : []),
    ...(acq.salesTax ? [{ label: t("gen.waterfall.tax"), values: () => -acq.salesTax }] : []),
    ...(acq.duty || acq.vat || acq.marineInsurance ? [{ label: t("gen.waterfall.duty"), values: () => -(acq.duty + acq.vat + acq.marineInsurance) }] : []),
    { label: t("report.repairsIncl"), values: (k) => -s[k].repair },
    { label: assumptions.exitStrategy === "EXPORT" ? t("report.exportLogistics") : t("gen.waterfall.logistics"), values: (k) => -s[k].logistics },
    { label: t("report.titleInspectionStorage"), values: (k) => -s[k].admin },
    { label: t("gen.waterfall.holding"), values: (k) => -s[k].holding },
    { label: t("gen.waterfall.selling"), values: (k) => -s[k].selling },
    ...(s.expected.extras ? [{ label: t("gen.waterfall.extras"), values: (k: ScenarioKey) => -s[k].extras }] : []),
    { label: t("gen.waterfall.profit"), values: (k) => s[k].profitAtMaxBid, bold: true, signed: true },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("report.whereMoneyGoes")}</CardTitle>
          <p className="text-muted-foreground text-xs">{t("report.whereMoneyNote", { amount: formatUsd(calc.maxBid ?? 0) })}</p>
        </CardHeader>
        <CardContent>
          <CostWaterfall rows={calc.waterfall} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("report.scenariosAtMax")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table data-testid="scenario-table">
            <TableHeader>
              <TableRow>
                <TableHead />
                {KEYS.map((k) => (
                  <TableHead key={k} className="text-right">
                    {t(`domain.scenario.${k}`)}
                  </TableHead>
                ))}
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
          <CardTitle className="text-base">{t("report.feesAt", { amount: formatUsd(calc.maxBid ?? 0) })}</CardTitle>
          <p className="text-muted-foreground text-xs">
            {input.feeSchedule.name}
            {input.feeSchedule.isPlaceholder ? t("report.placeholderFees") : ""}
          </p>
        </CardHeader>
        <CardContent>
          <dl className="num space-y-1.5 text-sm">
            {acq.fees.lines.map((l) => (
              <div key={l.label} className="flex justify-between">
                <dt className="text-muted-foreground">{trText(t, l.label)}</dt>
                <dd>{formatUsd(l.amount)}</dd>
              </div>
            ))}
            <div className="flex justify-between border-t pt-1.5 font-semibold">
              <dt>{t("report.totalFees")}</dt>
              <dd>{formatUsd(acq.fees.total)}</dd>
            </div>
          </dl>
          <p className="text-muted-foreground mt-3 text-xs">
            {t("report.bidsNote", {
              comfort: formatUsd(calc.comfortBid),
              max: formatUsd(calc.maxBid),
              target: formatUsd(calc.targetProfit),
              breakEven: formatUsd(calc.breakEvenBid),
            })}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
