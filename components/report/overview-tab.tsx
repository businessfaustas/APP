"use client";

import { ArrowRightIcon, ChevronDownIcon, CircleAlertIcon, InfoIcon, OctagonXIcon, TriangleAlertIcon } from "lucide-react";
import { useState } from "react";

import { CountTo } from "@/components/motion/count-to";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox, Disclosure } from "@/components/ui/misc";
import type { DamageZone, RiskFlag } from "@/lib/domain/schemas";
import { useT } from "@/lib/i18n/client";
import { trFlag, trText } from "@/lib/i18n/generated";
import { cn, formatUsd, shortUsd } from "@/lib/utils";

import { DamageZoneMap, zoneSeverities } from "./damage-zone-map";
import { useReport } from "./report-context";
import { SegmentedBar, SignedBars, type Part, type SignedRow } from "./viz";

const LEVEL_META: Record<RiskFlag["level"], { Icon: typeof InfoIcon; cls: string; pill: string }> = {
  HARD_STOP: { Icon: OctagonXIcon, cls: "text-stop", pill: "bg-stop-soft text-stop" },
  HIGH: { Icon: CircleAlertIcon, cls: "text-stop", pill: "bg-stop-soft text-stop" },
  MEDIUM: { Icon: TriangleAlertIcon, cls: "text-caution", pill: "bg-caution-soft text-caution" },
  INFO: { Icon: InfoIcon, cls: "text-muted-foreground", pill: "bg-muted text-muted-foreground" },
};

/** One flag: the title on a row, the explanation one click away. */
function FlagRow({ flag }: { flag: RiskFlag }) {
  const t = useT();
  const m = LEVEL_META[flag.level];
  const { title, detail } = trFlag(t, flag);
  return (
    <li>
      <details className="group">
        <summary className="hover:bg-muted/70 flex cursor-pointer list-none items-start gap-3 rounded-lg px-2.5 py-2 [&::-webkit-details-marker]:hidden">
          <m.Icon className={cn("mt-0.5 size-4 shrink-0", m.cls)} aria-hidden="true" />
          <span className="flex-1 text-sm leading-snug font-medium">{title}</span>
          <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium", m.pill)}>{t(`domain.level.${flag.level}`)}</span>
          <ChevronDownIcon className="text-muted-foreground mt-0.5 size-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <p className="text-muted-foreground pr-9 pb-2 pl-9.5 text-sm leading-relaxed">{detail}</p>
      </details>
    </li>
  );
}

/**
 * Risk flags. Interactive (the report): serious flags first, details on click, notes grouped.
 * Static (the landing page sample): every title with its explanation.
 */
export function RiskFlagsList({ flags, interactive = true }: { flags: RiskFlag[]; interactive?: boolean }) {
  const t = useT();
  if (flags.length === 0) return <p className="text-muted-foreground text-sm">{t("report.noFlags")}</p>;
  if (!interactive) {
    return (
      <ul className="space-y-3" data-testid="risk-flags">
        {flags.map((f) => {
          const m = LEVEL_META[f.level];
          const { title, detail } = trFlag(t, f);
          return (
            <li key={f.code} className="flex gap-3">
              <m.Icon className={cn("mt-0.5 size-4 shrink-0", m.cls)} aria-hidden="true" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  {title}
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", m.pill)}>{t(`domain.level.${f.level}`)}</span>
                </div>
                <div className="text-muted-foreground mt-0.5 text-sm">{detail}</div>
              </div>
            </li>
          );
        })}
      </ul>
    );
  }
  const main = flags.filter((f) => f.level !== "INFO");
  const notes = flags.filter((f) => f.level === "INFO");
  return (
    <div className="-mx-2.5 space-y-1" data-testid="risk-flags">
      {main.length > 0 && (
        <ul className="space-y-0.5">
          {main.map((f) => (
            <FlagRow key={f.code} flag={f} />
          ))}
        </ul>
      )}
      {notes.length > 0 &&
        (main.length > 0 ? (
          <Disclosure className="px-2.5" title={t("report.notesN", { n: notes.length })}>
            <ul className="-mx-2.5 space-y-0.5">
              {notes.map((f) => (
                <FlagRow key={f.code} flag={f} />
              ))}
            </ul>
          </Disclosure>
        ) : (
          <ul className="space-y-0.5">
            {notes.map((f) => (
              <FlagRow key={f.code} flag={f} />
            ))}
          </ul>
        ))}
    </div>
  );
}

/** Checklist lines in the active language (for lists that aren't interactive). */
export function ChecklistItems({ items }: { items: string[] }) {
  const t = useT();
  return (
    <>
      {items.map((item) => (
        <li key={item}>{trText(t, item)}</li>
      ))}
    </>
  );
}

function Checklist({ items }: { items: string[] }) {
  const t = useT();
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const pct = items.length ? Math.round((checked.size / items.length) * 100) : 0;
  if (items.length === 0) return null;
  return (
    <div className="surface bg-card rounded-2xl border px-6 py-2">
      <Disclosure
        title={
          <span className="flex items-center gap-3">
            {t("report.beforeYouBid")}
            <span className="bg-muted hidden h-1.5 w-24 overflow-hidden rounded-full sm:block" aria-hidden="true">
              <span className="bg-go block h-full rounded-full transition-[width] duration-300" style={{ width: `${pct}%` }} />
            </span>
          </span>
        }
        meta={checked.size ? t("report.doneOf", { done: checked.size, total: items.length }) : t("report.stepsN", { n: items.length })}
      >
        <ul className="grid gap-x-6 gap-y-0.5 pb-3 md:grid-cols-2" data-testid="checklist">
          {items.map((item, i) => (
            <li key={item}>
              <label
                htmlFor={`chk-${i}`}
                className="hover:bg-muted/70 -mx-2.5 flex cursor-pointer items-start gap-3 rounded-lg px-2.5 py-2 text-sm leading-snug"
              >
                <Checkbox
                  id={`chk-${i}`}
                  className="mt-0.5"
                  checked={checked.has(i)}
                  onCheckedChange={(c) =>
                    setChecked((s) => {
                      const n = new Set(s);
                      if (c) n.add(i);
                      else n.delete(i);
                      return n;
                    })
                  }
                />
                <span className={cn(checked.has(i) && "text-muted-foreground line-through")}>{trText(t, item)}</span>
              </label>
            </li>
          ))}
        </ul>
      </Disclosure>
    </div>
  );
}

function DataSources() {
  const { view } = useReport();
  const t = useT();
  const entries = Object.entries(view.dataSources);
  const fallbacks = entries.filter(([, v]) => !v.ok).length;
  if (entries.length === 0) return null;
  return (
    <div className="surface bg-card rounded-2xl border px-6 py-2">
      <Disclosure
        title={t("report.dataSources")}
        meta={fallbacks ? t("report.sourcesMeta", { n: entries.length, fallbacks }) : String(entries.length)}
        testId="data-sources"
      >
        <dl className="grid gap-x-8 gap-y-2.5 pb-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {entries.map(([k, v]) => (
            <div key={k} className="flex items-center gap-2.5">
              <span className={cn("size-2 shrink-0 rounded-full", v.ok ? "bg-go" : "bg-caution")} aria-hidden="true" />
              <dt className="text-muted-foreground w-28 shrink-0">{t.dyn(`report.ds.${k}`, undefined, k)}</dt>
              <dd className="flex min-w-0 items-center gap-1.5">
                <span className="truncate">{k === "logistics" ? t.dyn(`report.method.${v.provider}`, undefined, v.provider) : trText(t, v.provider)}</span>
                {v.isDemo && <Badge variant="info">{t("common.demo")}</Badge>}
                {!v.ok && <Badge variant="outline">{t("report.fallback")}</Badge>}
              </dd>
            </div>
          ))}
        </dl>
      </Disclosure>
    </div>
  );
}

const PURCHASE = ["bid", "fees", "broker", "tax", "duty"];
const REPAIRS = ["parts", "labor", "paint", "sublets", "contingency"];

/** Where the resale value goes at the max bid: purchase, repairs, everything else, profit. */
function MoneyCard() {
  const { calc } = useReport();
  const t = useT();
  if (!calc || calc.maxBid === null) return null;
  const sum = (keys: string[] | null) =>
    -calc.waterfall
      .filter((r) => r.key !== "resale" && r.key !== "profit" && (keys ? keys.includes(r.key) : !PURCHASE.includes(r.key) && !REPAIRS.includes(r.key)))
      .reduce((a, r) => a + r.amount, 0);
  const resale = calc.waterfall.find((r) => r.key === "resale")?.amount ?? 0;
  const profit = calc.waterfall.find((r) => r.key === "profit")?.amount ?? 0;
  const parts: Part[] = [
    { key: "purchase", label: t("report.purchase"), value: sum(PURCHASE), color: "var(--series-1)" },
    { key: "repairs", label: t("report.repair"), value: sum(REPAIRS), color: "var(--series-2)" },
    { key: "other", label: t("report.otherCosts"), value: sum(null), color: "var(--series-neutral)", ink: "#14161c" },
    ...(profit > 0 ? [{ key: "profit", label: t("report.profit"), value: profit, color: "var(--series-3)" }] : []),
  ];
  return (
    <Card className="rise" style={{ ["--i" as string]: 1 }} data-testid="money-card">
      <CardHeader>
        <CardTitle>{t("report.whereMoneyGoes")}</CardTitle>
        <CardDescription>
          {t("report.resale")}{" "}
          <span className="text-foreground font-semibold">
            <CountTo value={resale} format={formatUsd} />
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <SegmentedBar parts={parts} format={formatUsd} short={shortUsd} ariaLabel={t("report.whereMoneyGoes")} legend={false} />
        <ul className="divide-y text-sm">
          {parts.map((p) => (
            <li key={p.key} className="flex items-center gap-2.5 py-2 first:pt-0 last:pb-0">
              <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: p.color }} aria-hidden="true" />
              <span className={cn("flex-1", p.key === "profit" ? "font-medium" : "text-muted-foreground")}>{p.label}</span>
              <span className="num text-muted-foreground text-xs">{resale ? Math.round((p.value / resale) * 100) : 0}%</span>
              <span className="num w-20 text-right font-medium">{formatUsd(p.value)}</span>
            </li>
          ))}
        </ul>
        {profit <= 0 && <p className="text-stop text-sm">{t("report.lossNote", { amount: formatUsd(-profit) })}</p>}
      </CardContent>
    </Card>
  );
}

/** Profit in the worst, expected and best case at the max bid. */
function ScenarioCard() {
  const { calc } = useReport();
  const t = useT();
  if (!calc || calc.maxBid === null) return null;
  const rows: SignedRow[] = (["worst", "expected", "best"] as const).flatMap((k) => {
    const v = calc.scenarios[k].profitAtMaxBid;
    return v === null ? [] : [{ key: k, label: t(`domain.scenario.${k}`), value: v, emphasis: k === "expected" }];
  });
  if (rows.length === 0) return null;
  return (
    <Card className="rise" style={{ ["--i" as string]: 0 }} data-testid="scenario-card">
      <CardHeader>
        <CardTitle>{t("report.scenariosAtMax")}</CardTitle>
        <CardDescription>{t("report.profit")}</CardDescription>
      </CardHeader>
      <CardContent>
        <SignedBars rows={rows} format={formatUsd} ariaLabel={t("report.scenariosAtMax")} />
      </CardContent>
    </Card>
  );
}

function sevTone(sev: number): string {
  return sev > 6 ? "var(--status-critical)" : "var(--status-warning)";
}

/** The damaged zones at a glance, the repair estimate, and a way into the damage tab. */
function DamageCard({ onOpenTab }: { onOpenTab?: (tab: string) => void }) {
  const { view, calc, lineItems } = useReport();
  const t = useT();
  const sev = zoneSeverities(view.damage, lineItems);
  const zones = (Object.entries(sev) as [DamageZone, number][]).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  const repair = calc?.scenarios.expected.repair ?? null;
  return (
    <Card className="rise" style={{ ["--i" as string]: 2 }} data-testid="damage-card">
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="space-y-1.5">
          <CardTitle>{t("report.damageCard")}</CardTitle>
          {repair !== null && (
            <CardDescription>
              {t("report.repairEstimate")}{" "}
              <span className="text-foreground font-semibold">
                <CountTo value={repair} format={formatUsd} />
              </span>
            </CardDescription>
          )}
        </div>
        {onOpenTab && (
          <Button size="sm" variant="ghost" className="-mt-1 -mr-2 shrink-0" onClick={() => onOpenTab("damage")}>
            {t("report.damageDetails")} <ArrowRightIcon />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {zones.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("report.noZones")}</p>
        ) : (
          <div className="flex items-start gap-5">
            <div className="w-20 shrink-0">
              <DamageZoneMap severities={sev} selected={null} onSelect={() => onOpenTab?.("damage")} compact />
            </div>
            <ul className="min-w-0 flex-1 space-y-2.5" aria-label={t("report.damageCard")}>
              {zones.slice(0, 5).map(([z, n], i) => (
                <li key={z} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">{t(`report.zone.${z}`)}</span>
                    <span className="num text-muted-foreground text-xs">{n}/10</span>
                  </div>
                  <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                    <div className="grow-x h-full rounded-full" style={{ width: `${n * 10}%`, background: sevTone(n), ["--i" as string]: i }} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function OverviewTab({ onOpenTab }: { onOpenTab?: (tab: string) => void }) {
  const { view, calc, marketMissing } = useReport();
  const t = useT();
  // The AI's own summary (English only) is kept while the numbers still match it.
  const aiNarrative =
    t.locale === "en" &&
    view.dataSources.narrative?.provider === "AI summary" &&
    Boolean(view.narrative) &&
    calc?.maxBid === view.calc?.maxBid &&
    calc?.verdict === view.calc?.verdict;
  const bullets = aiNarrative
    ? (view.narrative ?? "")
        .split(/\n+/)
        .map((l) => l.replace(/^[•\-*]\s*/, "").trim())
        .filter(Boolean)
    : [];
  const serious = view.flags.filter((f) => f.level !== "INFO").length;

  return (
    <div className="space-y-6">
      {!marketMissing && (
        <div className="grid items-start gap-6 xl:grid-cols-2">
          <ScenarioCard />
          <MoneyCard />
        </div>
      )}
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <DamageCard onOpenTab={onOpenTab} />
        <Card className="rise" style={{ ["--i" as string]: 3 }}>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>{t("report.riskFlags")}</CardTitle>
            {serious > 0 && <Badge variant="caution">{t("report.toCheckN", { n: serious })}</Badge>}
          </CardHeader>
          <CardContent>
            <RiskFlagsList flags={view.flags} />
          </CardContent>
        </Card>
      </div>
      <Checklist items={view.checklist} />
      {bullets.length > 0 && (
        <div className="surface bg-card rounded-2xl border px-6 py-2">
          <Disclosure title={t("report.aiSummary")}>
            <ul className="space-y-2 pb-3 text-sm leading-relaxed">
              {bullets.map((b) => (
                <li key={b} className="flex gap-3">
                  <span className="bg-primary mt-2 size-1.5 shrink-0 rounded-full" aria-hidden="true" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <p className="text-muted-foreground pb-3 text-xs">{t("report.summaryNote")}</p>
          </Disclosure>
        </div>
      )}
      <DataSources />
    </div>
  );
}
