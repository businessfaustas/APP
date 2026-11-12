"use client";

import { CheckIcon, SearchIcon, TriangleAlertIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Stat, Tooltip } from "@/components/ui/misc";
import type { CalculationResult } from "@/lib/calc/types";
import { useT } from "@/lib/i18n/client";
import { trText } from "@/lib/i18n/generated";
import { cn, formatBps, formatUsd } from "@/lib/utils";

import { useReport } from "./report-context";
import { VerdictBadge } from "./verdict-badge";

export function scoreTone(score: number): "go" | "caution" | "stop" {
  return score >= 70 ? "go" : score >= 40 ? "caution" : "stop";
}

export function ScoreMeter({ score }: { score: number }) {
  const t = useT();
  const tone = scoreTone(score);
  return (
    <div className="space-y-1.5" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={score} aria-label={t("report.dealScore")}>
      <div className="flex items-baseline justify-between">
        <span className="text-muted-foreground text-xs">{t("report.dealScore")}</span>
        <span className="text-sm font-semibold">
          {score}
          <span className="text-muted-foreground">/100</span>
        </span>
      </div>
      <div className={cn("h-2 overflow-hidden rounded-full", tone === "go" ? "bg-go-soft" : tone === "caution" ? "bg-caution-soft" : "bg-stop-soft")}>
        <div
          className={cn("h-full rounded-full transition-[width] duration-300", tone === "go" ? "bg-go" : tone === "caution" ? "bg-caution" : "bg-stop")}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

const TONE_VAR = { go: "var(--go)", caution: "var(--caution)", stop: "var(--stop)" } as const;

/** Deal score as a ring gauge (0–100). */
export function ScoreRing({ score, size = 76 }: { score: number; size?: number }) {
  const t = useT();
  const tone = scoreTone(score);
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <div
      className="flex flex-col items-center gap-1"
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={score}
      aria-label={t("report.dealScore")}
    >
      <svg viewBox="0 0 76 76" width={size} height={size} className="-rotate-90">
        <circle cx="38" cy="38" r={r} fill="none" strokeWidth="7" className="stroke-muted" />
        <circle
          cx="38"
          cy="38"
          r={r}
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          stroke={TONE_VAR[tone]}
          strokeDasharray={`${(Math.max(0, Math.min(100, score)) / 100) * c} ${c}`}
          className="transition-[stroke-dasharray] duration-500"
        />
        <text
          x="38"
          y="38"
          transform="rotate(90 38 38)"
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-foreground num text-[19px] font-semibold"
        >
          {score}
        </text>
      </svg>
      <span className="eyebrow">{t("report.dealScore")}</span>
    </div>
  );
}

/** Horizontal bid scale: comfort / max / break-even zones with the current-bid marker. */
export function BidLadder({ calc, currentBid }: { calc: CalculationResult; currentBid: number | null }) {
  const t = useT();
  const { comfortBid, maxBid, breakEvenBid } = calc;
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => setWidth(entries[0]?.contentRect.width ?? 0));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  if (maxBid === null) return null;
  const be = breakEvenBid ?? maxBid;
  const top = Math.max(be, maxBid, currentBid ?? 0) * 1.15 || 1;
  const pct = (v: number) => `${Math.min(100, Math.max(0, (v / top) * 100))}%`;
  const comfort = comfortBid ?? 0;
  const zones = [
    { from: 0, to: comfort, cls: "bg-go", label: t("report.zoneSafe") },
    { from: comfort, to: maxBid, cls: "bg-go/45", label: t("report.zoneTarget") },
    { from: maxBid, to: be, cls: "bg-caution/70", label: t("report.zoneBelow") },
    { from: be, to: top, cls: "bg-stop/60", label: t("report.zoneLoss") },
  ].filter((z) => z.to > z.from);
  const marks = [
    ...(comfortBid !== null ? [{ v: comfortBid, label: t("report.ladderComfort") }] : []),
    { v: maxBid, label: t("report.ladderMax") },
    ...(breakEvenBid !== null && breakEvenBid !== maxBid ? [{ v: breakEvenBid, label: t("report.breakEven") }] : []),
  ];
  // stagger labels that would collide (closer than ~84px) onto a second row
  const minGapPct = width > 0 ? (84 / width) * 100 : 20;
  const placed: { v: number; label: string; row: number; align: string }[] = [];
  let lastRow0 = -Infinity;
  marks.forEach((m, i) => {
    const p = (m.v / top) * 100;
    const row = p - lastRow0 < minGapPct ? 1 : 0;
    if (row === 0) lastRow0 = p;
    placed.push({ ...m, row, align: p < 10 ? "translate-x-0" : p > 88 || (i === marks.length - 1 && p > 75) ? "-translate-x-full" : "-translate-x-1/2" });
  });
  const rows = placed.some((m) => m.row === 1) ? 2 : 1;
  return (
    <div className="space-y-2" data-testid="bid-ladder" ref={ref}>
      <div className="relative pt-7">
        {currentBid !== null && (
          <div className="absolute top-0 -translate-x-1/2 text-center" style={{ left: pct(currentBid) }}>
            <div className="text-xs font-medium whitespace-nowrap">{t("report.ladderCurrent", { amount: formatUsd(currentBid) })}</div>
            <div className="bg-foreground mx-auto h-3 w-0.5" />
          </div>
        )}
        <div className="flex h-3.5 w-full gap-0.5 overflow-hidden rounded-full">
          {zones.map((z) => (
            <Tooltip key={z.label} content={`${z.label}: ${formatUsd(z.from)} – ${z.to >= top ? t("report.andUp") : formatUsd(z.to)}`}>
              <div className={cn("h-full", z.cls)} style={{ width: `${((z.to - z.from) / top) * 100}%` }} />
            </Tooltip>
          ))}
        </div>
        <div className={cn("relative mt-1", rows > 1 ? "h-[4.5rem]" : "h-9")}>
          {placed.map((m) => (
            <div key={m.label} className={cn("absolute text-xs leading-tight whitespace-nowrap", m.align)} style={{ left: pct(m.v), top: m.row * 34 }}>
              <div className="text-muted-foreground">{m.label}</div>
              <div className="num font-semibold">{formatUsd(m.v)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MarketMissing() {
  const { setAssumption } = useReport();
  const t = useT();
  const [value, setValue] = useState("");
  return (
    <Card className="brand-glow overflow-hidden" data-testid="market-missing">
      <CardContent className="space-y-5">
        <div className="flex items-start gap-4">
          <span className="bg-caution-soft text-caution grid size-11 shrink-0 place-items-center rounded-xl">
            <SearchIcon className="size-5" />
          </span>
          <div className="space-y-1.5">
            <h2 className="text-xl font-semibold tracking-tight">{t("report.mvTitle")}</h2>
            <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">{t("report.mvBody")}</p>
          </div>
        </div>
        <form
          className="flex max-w-lg gap-2 sm:pl-15"
          onSubmit={(e) => {
            e.preventDefault();
            const n = Number(value.replace(/[^\d]/g, ""));
            if (n > 0) setAssumption("mvCleanOverride", n);
          }}
        >
          <div className="relative flex-1">
            <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-base">$</span>
            <Input
              inputMode="numeric"
              placeholder={t("report.mvPlaceholder")}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              aria-label={t("report.mvLabel")}
              className="num h-11 pl-7 text-base"
            />
          </div>
          <Button type="submit" size="lg">
            {t("report.calculate")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function DealCard() {
  const { calc, view, assumptions, marketMissing } = useReport();
  if (marketMissing) return <MarketMissing />;
  if (!calc) return null;
  const currentBid = assumptions.currentBidOverride ?? view.base?.currentBid ?? null;
  return <DealSummary calc={calc} currentBid={currentBid} />;
}

const VERDICT_TONE = { GO: "go", BE_CAUTIOUS: "caution", WALK_AWAY: "stop" } as const;

/** Verdict, max bid, key numbers, score and bid ladder for a calculation result. */
export function DealSummary({ calc, currentBid }: { calc: CalculationResult; currentBid: number | null }) {
  const t = useT();
  const e = calc.scenarios.expected;
  const tone = VERDICT_TONE[calc.verdict];
  const worst = calc.scenarios.worst.profitAtMaxBid;
  return (
    <Card
      className="overflow-hidden"
      data-testid="deal-card"
      style={{ backgroundImage: `radial-gradient(110% 120% at 0% 0%, color-mix(in oklab, ${TONE_VAR[tone]} 13%, transparent), transparent 58%)` }}
    >
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-4">
            <VerdictBadge verdict={calc.verdict} size="lg" />
            {calc.maxBid !== null ? (
              <div>
                <div className="eyebrow">{t("report.doNotBidAbove")}</div>
                <div className="num mt-1 text-5xl font-semibold tracking-tight sm:text-6xl" data-testid="max-bid">
                  {formatUsd(calc.maxBid)}
                </div>
                <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  {currentBid !== null ? (
                    <>
                      <span>
                        {t("report.currentBid")} <span className="num text-foreground font-medium">{formatUsd(currentBid)}</span>
                      </span>
                      {calc.headroomBps !== null && (
                        <span
                          className={cn(
                            "num rounded-full px-2 py-0.5 text-xs font-medium",
                            calc.headroomBps < 1500 ? "bg-caution-soft text-caution" : "bg-go-soft text-go",
                          )}
                        >
                          {t("report.headroom", { pct: formatBps(calc.headroomBps, 0) })}
                        </span>
                      )}
                      {e.profitAtCurrentBid !== null && <span>{t("report.atCurrentBid", { amount: formatUsd(e.profitAtCurrentBid) })}</span>}
                    </>
                  ) : (
                    t("report.noCurrentBid")
                  )}
                </div>
              </div>
            ) : (
              <div className="max-w-md text-xl font-semibold tracking-tight">{t("report.noBidReaches")}</div>
            )}
          </div>
          <ScoreRing score={calc.dealScore} />
        </div>

        <div className="bg-background/60 dark:bg-background/40 grid grid-cols-2 gap-x-6 gap-y-5 rounded-xl border p-5 lg:grid-cols-4">
          <Stat
            label={t("report.expectedProfit")}
            value={formatUsd(e.profitAtMaxBid)}
            tone={(e.profitAtMaxBid ?? 0) < 0 ? "stop" : undefined}
            sub={t("report.worstBest", { worst: formatUsd(worst), best: formatUsd(calc.scenarios.best.profitAtMaxBid) })}
          />
          <Stat label="ROI" value={formatBps(e.roiAtMaxBidBps)} sub={t("report.target", { amount: formatUsd(calc.targetProfit) })} />
          <Stat label={t("report.comfortBid")} value={formatUsd(calc.comfortBid)} sub={t("report.comfortSub")} />
          <Stat label={t("report.breakEven")} value={formatUsd(calc.breakEvenBid)} sub={t("report.breakEvenSub")} />
        </div>

        <BidLadder calc={calc} currentBid={currentBid} />

        {calc.verdictReasons.length > 0 && (
          <div className="border-t pt-5">
            <div className="eyebrow mb-3">{t("report.whyVerdict")}</div>
            <ul className="grid gap-2.5 text-sm sm:grid-cols-2">
              {calc.verdictReasons.slice(0, 4).map((r) => (
                <li key={r} className="flex gap-2.5">
                  {tone === "go" ? (
                    <CheckIcon className="text-go mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  ) : (
                    <TriangleAlertIcon className={cn("mt-0.5 size-4 shrink-0", tone === "stop" ? "text-stop" : "text-caution")} aria-hidden="true" />
                  )}
                  <span className="leading-snug">{trText(t, r)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
