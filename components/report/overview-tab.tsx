"use client";

import { ChevronDownIcon, CircleAlertIcon, InfoIcon, OctagonXIcon, TriangleAlertIcon } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox, Disclosure } from "@/components/ui/misc";
import type { RiskFlag } from "@/lib/domain/schemas";
import { useT } from "@/lib/i18n/client";
import { localizedSummary, trFlag, trText } from "@/lib/i18n/generated";
import { cn } from "@/lib/utils";

import { useReport } from "./report-context";

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
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
          <div className="bg-go h-full rounded-full transition-[width] duration-300" style={{ width: `${pct}%` }} />
        </div>
        <span className="num text-muted-foreground text-xs">{t("report.doneOf", { done: checked.size, total: items.length })}</span>
      </div>
      <ul className="space-y-1" data-testid="checklist">
        {items.map((item, i) => (
          <li key={item}>
            <label htmlFor={`chk-${i}`} className="hover:bg-muted/70 -mx-2.5 flex cursor-pointer items-start gap-3 rounded-lg px-2.5 py-2 text-sm leading-snug">
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
    <div className="bg-card rounded-2xl border px-6 py-2">
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

export function OverviewTab() {
  const { view, calc, assumptions, marketMissing } = useReport();
  const t = useT();
  const currentBid = assumptions.currentBidOverride ?? view.base?.currentBid ?? null;
  // The AI's own summary (English only) is kept while the numbers still match it; otherwise the
  // summary is rebuilt from the live calculation, so it never contradicts the cards above.
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
    : calc && !marketMissing
      ? localizedSummary(t, { calc, currentBid, flags: view.flags, checklist: view.checklist }, ["costs", "risks"])
      : [];
  const serious = view.flags.filter((f) => f.level !== "INFO").length;

  return (
    <div className="space-y-6">
      {bullets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("report.summary")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2.5 text-sm leading-relaxed">
              {bullets.map((b) => (
                <li key={b} className="flex gap-3">
                  <span className="bg-primary mt-2 size-1.5 shrink-0 rounded-full" aria-hidden="true" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <p className="text-muted-foreground mt-4 text-xs">{aiNarrative ? t("report.summaryNote") : t("report.summaryLive")}</p>
          </CardContent>
        </Card>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>{t("report.riskFlags")}</CardTitle>
            {serious > 0 && <Badge variant="caution">{t("report.toCheckN", { n: serious })}</Badge>}
          </CardHeader>
          <CardContent>
            <RiskFlagsList flags={view.flags} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("report.beforeYouBid")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Checklist items={view.checklist} />
          </CardContent>
        </Card>
      </div>
      <DataSources />
    </div>
  );
}
