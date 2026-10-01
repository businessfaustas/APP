"use client";

import { InfoIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tooltip } from "@/components/ui/misc";
import type { CalculationResult } from "@/lib/calc/types";
import { cn, formatBps, formatUsd } from "@/lib/utils";

import { useReport } from "./report-context";
import { VerdictBadge } from "./verdict-badge";

export function scoreTone(score: number): "go" | "caution" | "stop" {
  return score >= 70 ? "go" : score >= 40 ? "caution" : "stop";
}

export function ScoreMeter({ score }: { score: number }) {
  const tone = scoreTone(score);
  return (
    <div className="space-y-1.5" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={score} aria-label="Deal score">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-muted-foreground">Deal score</span>
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

/** Horizontal bid scale: comfort / max / break-even zones with the current-bid marker. */
export function BidLadder({ calc, currentBid }: { calc: CalculationResult; currentBid: number | null }) {
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
    { from: 0, to: comfort, cls: "bg-go", label: "Safe even in the worst case" },
    { from: comfort, to: maxBid, cls: "bg-go/45", label: "Hits your profit target" },
    { from: maxBid, to: be, cls: "bg-caution/70", label: "Profit below your target" },
    { from: be, to: top, cls: "bg-stop/60", label: "Loses money (expected case)" },
  ].filter((z) => z.to > z.from);
  const marks = [
    ...(comfortBid !== null ? [{ v: comfortBid, label: "Comfort" }] : []),
    { v: maxBid, label: "Max" },
    ...(breakEvenBid !== null && breakEvenBid !== maxBid ? [{ v: breakEvenBid, label: "Break-even" }] : []),
  ];
  // stagger labels that would collide (closer than ~84px) onto a second row
  const minGapPct = width > 0 ? (84 / width) * 100 : 20;
  const placed: { v: number; label: string; row: number; align: string }[] = [];
  let lastRow0 = -Infinity;
  marks.forEach((m, i) => {
    const p = (m.v / top) * 100;
    const row = p - lastRow0 < minGapPct ? 1 : 0;
    if (row === 0) lastRow0 = p;
    placed.push({ ...m, row, align: p < 10 ? "translate-x-0" : p > 88 || i === marks.length - 1 && p > 75 ? "-translate-x-full" : "-translate-x-1/2" });
  });
  const rows = placed.some((m) => m.row === 1) ? 2 : 1;
  return (
    <div className="space-y-2" data-testid="bid-ladder" ref={ref}>
      <div className="relative pt-7">
        {currentBid !== null && (
          <div className="absolute top-0 -translate-x-1/2 text-center" style={{ left: pct(currentBid) }}>
            <div className="text-[11px] font-medium whitespace-nowrap">Current {formatUsd(currentBid)}</div>
            <div className="mx-auto h-3 w-0.5 bg-foreground" />
          </div>
        )}
        <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full">
          {zones.map((z) => (
            <Tooltip key={z.label} content={`${z.label}: ${formatUsd(z.from)} – ${z.to >= top ? "and up" : formatUsd(z.to)}`}>
              <div className={cn("h-full", z.cls)} style={{ width: `${((z.to - z.from) / top) * 100}%` }} />
            </Tooltip>
          ))}
        </div>
        <div className={cn("relative mt-1", rows > 1 ? "h-[4.5rem]" : "h-9")}>
          {placed.map((m) => (
            <div
              key={m.label}
              className={cn("absolute text-[11px] leading-tight whitespace-nowrap", m.align)}
              style={{ left: pct(m.v), top: m.row * 34 }}
            >
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
  const [value, setValue] = useState("");
  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-2">
          <InfoIcon className="mt-0.5 size-5 shrink-0 text-caution" />
          <div>
            <div className="font-semibold">Enter the market value to get your max bid</div>
            <p className="text-sm text-muted-foreground">
              No market-data source is configured, so we can&apos;t price this car yet. Enter what it sells for with a clean title in your area (median of local
              listings).
            </p>
          </div>
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const n = Number(value.replace(/[^\d]/g, ""));
            if (n > 0) setAssumption("mvCleanOverride", n);
          }}
        >
          <Input inputMode="numeric" placeholder="e.g. 17,700" value={value} onChange={(e) => setValue(e.target.value)} aria-label="Clean retail market value" />
          <Button type="submit">Calculate</Button>
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

/** Verdict, max bid, profit range, score and bid ladder for a calculation result. */
export function DealSummary({ calc, currentBid }: { calc: CalculationResult; currentBid: number | null }) {
  const e = calc.scenarios.expected;
  return (
    <Card className="overflow-hidden" data-testid="deal-card">
      <CardContent className="space-y-5">
        <div className="grid gap-5 md:grid-cols-[1.3fr_1fr_0.8fr] md:items-center">
          <div className="space-y-3">
            <VerdictBadge verdict={calc.verdict} size="lg" />
            {calc.maxBid !== null ? (
              <div>
                <div className="text-sm text-muted-foreground">Do not bid above</div>
                <div className="text-5xl font-semibold tracking-tight" data-testid="max-bid">
                  {formatUsd(calc.maxBid)}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {currentBid !== null ? (
                    <>
                      Current bid <span className="num text-foreground">{formatUsd(currentBid)}</span>
                      {calc.headroomBps !== null && (
                        <>
                          {" · "}
                          <span className={cn(calc.headroomBps < 1500 ? "text-caution" : "text-foreground")}>{formatBps(calc.headroomBps, 0)} headroom</span>
                        </>
                      )}
                    </>
                  ) : (
                    "No current bid yet"
                  )}
                </div>
              </div>
            ) : (
              <div className="text-lg font-semibold">No bid reaches your profit target</div>
            )}
          </div>
          <div className="space-y-3 rounded-lg bg-muted/50 p-4">
            <div>
              <div className="text-xs text-muted-foreground">Expected profit at max bid</div>
              <div className={cn("text-2xl font-semibold", (e.profitAtMaxBid ?? 0) < 0 && "text-stop")}>{formatUsd(e.profitAtMaxBid)}</div>
              <div className="text-xs text-muted-foreground">ROI {formatBps(e.roiAtMaxBidBps)} · target {formatUsd(calc.targetProfit)}</div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-muted-foreground">Worst case</div>
                <div className={cn("num font-medium", (calc.scenarios.worst.profitAtMaxBid ?? 0) < 0 && "text-stop")}>{formatUsd(calc.scenarios.worst.profitAtMaxBid)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Best case</div>
                <div className="num font-medium">{formatUsd(calc.scenarios.best.profitAtMaxBid)}</div>
              </div>
              {e.profitAtCurrentBid !== null && (
                <div className="col-span-2">
                  <div className="text-muted-foreground">If you win at the current bid</div>
                  <div className="num font-medium">{formatUsd(e.profitAtCurrentBid)}</div>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-4">
            <ScoreMeter score={calc.dealScore} />
            <ul className="space-y-1.5 text-sm">
              {calc.verdictReasons.slice(0, 3).map((r) => (
                <li key={r} className="flex gap-2">
                  <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", calc.verdict === "GO" ? "bg-go" : calc.verdict === "BE_CAUTIOUS" ? "bg-caution" : "bg-stop")} />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <BidLadder calc={calc} currentBid={currentBid} />
      </CardContent>
    </Card>
  );
}
