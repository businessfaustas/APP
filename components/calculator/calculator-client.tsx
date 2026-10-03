"use client";

import { RotateCcwIcon, WandSparklesIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { CostWaterfall } from "@/components/report/charts";
import { DealSummary } from "@/components/report/deal-card";
import { MoneyInput, SliderRow } from "@/components/report/what-if-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SegmentedControl, Separator } from "@/components/ui/misc";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { holdingDaysFor, settingsFromAssumptions, type Assumptions } from "@/lib/calc/build";
import { calculate } from "@/lib/calc/calculator";
import { contingencyForSeverity, scenarioContingencyBps } from "@/lib/calc/repair";
import type { FeeSchedule, ScenarioKey } from "@/lib/calc/types";
import type { BuyerType } from "@/lib/domain/schemas";
import { useT } from "@/lib/i18n/client";
import { formatBps, formatUsd } from "@/lib/utils";

type Field = "mvClean" | "parts" | "body" | "paint" | "mech" | "sublets";
type Grid = Record<Field, Record<ScenarioKey, number>>;

const FIELDS = [
  { key: "mvClean", label: "mvClean", step: 1 },
  { key: "parts", label: "parts", step: 1 },
  { key: "body", label: "body_", step: 0.1 },
  { key: "paint", label: "paint", step: 0.1 },
  { key: "mech", label: "mech", step: 0.1 },
  { key: "sublets", label: "sublets", step: 1 },
] as const satisfies readonly { key: Field; label: string; step: number }[];

/** Starts from the 2019 Audi A3 reference case so the numbers can be checked by hand. */
const EXAMPLE: Grid = {
  mvClean: { best: 18800, expected: 17700, worst: 16600 },
  parts: { best: 1700, expected: 2070, worst: 2900 },
  body: { best: 14, expected: 16, worst: 20 },
  paint: { best: 6, expected: 7, worst: 8 },
  mech: { best: 0, expected: 0, worst: 2 },
  sublets: { best: 150, expected: 270, worst: 520 },
};

const SPREAD: Record<Field, { best: number; worst: number }> = {
  mvClean: { best: 1.06, worst: 0.94 },
  parts: { best: 0.82, worst: 1.4 },
  body: { best: 0.87, worst: 1.25 },
  paint: { best: 0.86, worst: 1.15 },
  mech: { best: 0.8, worst: 1.5 },
  sublets: { best: 0.6, worst: 1.9 },
};

function GridInput({ value, onCommit, label, step }: { value: number; onCommit: (v: number) => void; label: string; step: number }) {
  const [text, setText] = useState<string | null>(null);
  return (
    <Input
      aria-label={label}
      inputMode="decimal"
      value={text ?? String(value)}
      onFocus={() => setText(String(value))}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        const n = Number((text ?? "").replace(/[^\d.]/g, ""));
        if (text !== null && Number.isFinite(n)) onCommit(step < 1 ? Math.round(n * 10) / 10 : Math.round(n));
        setText(null);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      className="num h-8 text-right"
    />
  );
}

export function CalculatorClient({
  defaults,
  feeSchedules,
}: {
  defaults: Assumptions;
  feeSchedules: Record<"COPART" | "IAAI", Record<BuyerType, FeeSchedule>>;
}) {
  const t = useT();
  const [grid, setGrid] = useState<Grid>(EXAMPLE);
  const [severity, setSeverity] = useState(5);
  const [auction, setAuction] = useState<"COPART" | "IAAI">("COPART");
  const [currentBid, setCurrentBid] = useState<number | null>(2100);
  const [distance, setDistance] = useState(240);
  const [a, setA] = useState<Assumptions>(defaults);
  const set =
    <K extends keyof Assumptions>(k: K) =>
    (v: Assumptions[K]) =>
      setA((x) => ({ ...x, [k]: v }));

  const calc = useMemo(() => {
    const base = a.contingencyOverrideBps ?? contingencyForSeverity(severity);
    const scen = (k: ScenarioKey) => ({
      mvClean: grid.mvClean[k],
      holdingDays: holdingDaysFor(a.holdingDaysExpected, k),
      repair: {
        partsCost: grid.parts[k],
        bodyHours: grid.body[k],
        paintHours: grid.paint[k],
        mechHours: grid.mech[k],
        subletCost: grid.sublets[k],
        contingencyBps: scenarioContingencyBps(base, k),
      },
    });
    return calculate(
      {
        scenarios: { best: scen("best"), expected: scen("expected"), worst: scen("worst") },
        distanceMiles: distance,
        feeSchedule: feeSchedules[auction][a.buyerType],
        extraFixedCosts: [],
        currentBid,
        signals: { severity, frameSuspected: false, floodSuspected: false, airbagsDeployed: false, overallConfidence: 1, flags: [] },
      },
      settingsFromAssumptions(a),
    );
  }, [grid, severity, auction, currentBid, distance, a, feeSchedules]);

  const fillFromExpected = () =>
    setGrid((g) => {
      const next = { ...g };
      for (const f of FIELDS) {
        const e = g[f.key].expected;
        const r = (x: number) => ((f.step as number) < 1 ? Math.round(x * 10) / 10 : Math.round(x / 10) * 10);
        next[f.key] = { best: r(e * SPREAD[f.key].best), expected: e, worst: r(e * SPREAD[f.key].worst) };
      }
      return next;
    });

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-5">
        <DealSummary calc={calc} currentBid={currentBid} />
        <Card>
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">{t("calc.yourNumbers")}</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={fillFromExpected}>
                <WandSparklesIcon /> {t("calc.fill")}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setGrid(EXAMPLE)}>
                <RotateCcwIcon /> {t("calc.example")}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead />
                  <TableHead className="text-right">{t("domain.scenario.best")}</TableHead>
                  <TableHead className="text-right">{t("domain.scenario.expected")}</TableHead>
                  <TableHead className="text-right">{t("domain.scenario.worst")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {FIELDS.map((f) => (
                  <TableRow key={f.key}>
                    <TableCell className="text-sm">{t(`calc.${f.label}`)}</TableCell>
                    {(["best", "expected", "worst"] as const).map((k) => (
                      <TableCell key={k} className="min-w-24">
                        <GridInput
                          label={`${t(`calc.${f.label}`)} — ${t(`domain.scenario.${k}`)}`}
                          step={f.step}
                          value={grid[f.key][k]}
                          onCommit={(v) => setGrid((g) => ({ ...g, [f.key]: { ...g[f.key], [k]: v } }))}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs font-normal">{t("calc.feeTable")}</Label>
                <SegmentedControl
                  ariaLabel={t("calc.auction")}
                  value={auction}
                  onValueChange={setAuction}
                  options={[
                    { value: "COPART", label: "Copart" },
                    { value: "IAAI", label: "IAAI" },
                  ]}
                />
              </div>
              <MoneyInput label={t("calc.currentBid")} value={currentBid} onCommit={setCurrentBid} />
              <MoneyInput label={t("calc.distance")} value={distance} onCommit={(v) => setDistance(v ?? 0)} />
              <SliderRow
                label={t("calc.severity")}
                value={severity}
                min={1}
                max={10}
                step={1}
                format={(v) => `${v}/10 → ${formatBps(contingencyForSeverity(v), 0)}`}
                onChange={setSeverity}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("calc.whereMoney")}</CardTitle>
          </CardHeader>
          <CardContent>
            <CostWaterfall rows={calc.waterfall} />
            <p className="text-muted-foreground mt-2 text-xs">
              {t("calc.footnote", {
                repair: formatUsd(calc.scenarios.expected.repair),
                fees: formatUsd(calc.feesAtMaxBid?.total ?? null),
                resale: formatUsd(calc.scenarios.expected.resale),
              })}
            </p>
          </CardContent>
        </Card>
      </div>
      <aside>
        <Card className="lg:sticky lg:top-4">
          <CardContent className="space-y-5">
            <h2 className="font-semibold">{t("calc.assumptions")}</h2>
            <SliderRow
              label={t("report.laborRate")}
              value={a.laborRate}
              min={40}
              max={150}
              step={5}
              format={(v) => t("report.perHour", { v })}
              onChange={set("laborRate")}
            />
            <SliderRow
              label={t("report.paintMaterials")}
              value={a.paintMaterialsPerHour}
              min={20}
              max={80}
              step={5}
              format={(v) => t("report.perPaintHour", { v })}
              onChange={set("paintMaterialsPerHour")}
            />
            <SliderRow
              label={t("report.partsDiscount")}
              value={a.partsDiscountBps}
              min={0}
              max={4000}
              step={100}
              format={(v) => formatBps(v, 0)}
              onChange={set("partsDiscountBps")}
            />
            <Separator />
            <SliderRow
              label={t("report.targetProfit")}
              value={a.targetProfitBps}
              min={0}
              max={4000}
              step={100}
              format={(v) => formatBps(v, 0)}
              onChange={set("targetProfitBps")}
            />
            <SliderRow
              label={t("report.minProfit")}
              value={a.targetProfitMin}
              min={0}
              max={10000}
              step={250}
              format={(v) => formatUsd(v)}
              onChange={set("targetProfitMin")}
            />
            <SliderRow
              label={t("report.rebuiltValue")}
              value={a.rebuiltFactorBps}
              min={5000}
              max={10000}
              step={100}
              format={(v) => formatBps(v, 0)}
              onChange={set("rebuiltFactorBps")}
            />
            <Separator />
            <SliderRow
              label={t("report.transport")}
              value={a.transportCentsPerMile}
              min={50}
              max={400}
              step={5}
              format={(v) => t("report.perMile", { v: (v / 100).toFixed(2) })}
              onChange={set("transportCentsPerMile")}
            />
            <SliderRow
              label={t("report.holdingTime")}
              value={a.holdingDaysExpected}
              min={0}
              max={120}
              step={5}
              format={(v) => t("report.days", { n: v })}
              onChange={set("holdingDaysExpected")}
            />
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs font-normal">{t("report.buyerType")}</Label>
              <SegmentedControl
                ariaLabel={t("report.buyerType")}
                value={a.buyerType}
                onValueChange={set("buyerType")}
                options={[
                  { value: "LICENSED_DEALER", label: t("domain.buyerType.LICENSED_DEALER") },
                  { value: "PUBLIC_VIA_BROKER", label: t("report.publicBroker") },
                ]}
              />
            </div>
            <MoneyInput label={t("report.brokerFee")} value={a.brokerFee} onCommit={(v) => set("brokerFee")(v ?? 0)} />
            <SliderRow
              label={t("report.salesTax")}
              value={a.salesTaxBps}
              min={0}
              max={1200}
              step={25}
              format={(v) => formatBps(v, 2)}
              onChange={set("salesTaxBps")}
            />
            <Button size="sm" variant="ghost" onClick={() => setA(defaults)}>
              <RotateCcwIcon /> {t("calc.resetDefaults")}
            </Button>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
