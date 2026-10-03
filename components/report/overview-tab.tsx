"use client";

import { CircleAlertIcon, InfoIcon, OctagonXIcon, TriangleAlertIcon } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/misc";
import type { RiskFlag } from "@/lib/domain/schemas";
import { useT } from "@/lib/i18n/client";
import { localizedSummary, trFlag, trText } from "@/lib/i18n/generated";
import { cn } from "@/lib/utils";

import { useReport } from "./report-context";

const LEVEL_META: Record<RiskFlag["level"], { Icon: typeof InfoIcon; cls: string }> = {
  HARD_STOP: { Icon: OctagonXIcon, cls: "text-stop" },
  HIGH: { Icon: CircleAlertIcon, cls: "text-stop" },
  MEDIUM: { Icon: TriangleAlertIcon, cls: "text-caution" },
  INFO: { Icon: InfoIcon, cls: "text-muted-foreground" },
};

export function RiskFlagsList({ flags }: { flags: RiskFlag[] }) {
  const t = useT();
  if (flags.length === 0) return <p className="text-muted-foreground text-sm">{t("report.noFlags")}</p>;
  return (
    <ul className="space-y-2.5" data-testid="risk-flags">
      {flags.map((f) => {
        const m = LEVEL_META[f.level];
        const { title, detail } = trFlag(t, f);
        return (
          <li key={f.code} className="flex gap-2.5">
            <m.Icon className={cn("mt-0.5 size-4 shrink-0", m.cls)} aria-hidden="true" />
            <div className="min-w-0">
              <div className="text-sm font-medium">
                {title} <span className={cn("ml-1 text-[11px] font-normal uppercase", m.cls)}>{t(`domain.level.${f.level}`)}</span>
              </div>
              <div className="text-muted-foreground text-xs">{detail}</div>
            </div>
          </li>
        );
      })}
    </ul>
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

export function OverviewTab() {
  const { view } = useReport();
  const t = useT();
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const bullets =
    t.locale !== "en" && view.calc
      ? localizedSummary(t, { calc: view.calc, currentBid: view.listing?.currentBid ?? null, flags: view.flags, checklist: view.checklist })
      : (view.narrative ?? "")
          .split(/\n+/)
          .map((l) => l.replace(/^[•\-*]\s*/, "").trim())
          .filter(Boolean);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">{t("report.summary")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {bullets.map((b) => (
              <li key={b} className="flex gap-2">
                <span className="bg-primary mt-2 size-1.5 shrink-0 rounded-full" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground mt-3 text-xs">{t("report.summaryNote")}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("report.riskFlags")}</CardTitle>
        </CardHeader>
        <CardContent>
          <RiskFlagsList flags={view.flags} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("report.beforeYouBid")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2.5" data-testid="checklist">
            {view.checklist.map((item, i) => (
              <li key={item} className="flex items-start gap-2.5">
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
                <label htmlFor={`chk-${i}`} className={cn("text-sm", checked.has(i) && "text-muted-foreground line-through")}>
                  {trText(t, item)}
                </label>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">{t("report.dataSources")}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(view.dataSources).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">{t.dyn(`report.ds.${k}`, undefined, k)}</dt>
                <dd className="flex items-center gap-1.5 text-right">
                  <span className={cn(!v.ok && "text-muted-foreground")}>
                    {k === "logistics" ? t.dyn(`report.method.${v.provider}`, undefined, v.provider) : trText(t, v.provider)}
                  </span>
                  {v.isDemo && <Badge variant="info">{t("common.demo")}</Badge>}
                  {!v.ok && <Badge variant="outline">{t("report.fallback")}</Badge>}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
