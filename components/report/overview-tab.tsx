"use client";

import { CircleAlertIcon, InfoIcon, OctagonXIcon, TriangleAlertIcon } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/misc";
import type { RiskFlag } from "@/lib/domain/schemas";
import { cn } from "@/lib/utils";

import { useReport } from "./report-context";

const LEVEL_META: Record<RiskFlag["level"], { label: string; Icon: typeof InfoIcon; cls: string }> = {
  HARD_STOP: { label: "Hard stop", Icon: OctagonXIcon, cls: "text-stop" },
  HIGH: { label: "High risk", Icon: CircleAlertIcon, cls: "text-stop" },
  MEDIUM: { label: "Medium", Icon: TriangleAlertIcon, cls: "text-caution" },
  INFO: { label: "Info", Icon: InfoIcon, cls: "text-muted-foreground" },
};

export function RiskFlagsList({ flags }: { flags: RiskFlag[] }) {
  if (flags.length === 0) return <p className="text-sm text-muted-foreground">No risk flags.</p>;
  return (
    <ul className="space-y-2.5" data-testid="risk-flags">
      {flags.map((f) => {
        const m = LEVEL_META[f.level];
        return (
          <li key={f.code} className="flex gap-2.5">
            <m.Icon className={cn("mt-0.5 size-4 shrink-0", m.cls)} aria-hidden="true" />
            <div className="min-w-0">
              <div className="text-sm font-medium">
                {f.title} <span className={cn("ml-1 text-[11px] font-normal uppercase", m.cls)}>{m.label}</span>
              </div>
              <div className="text-xs text-muted-foreground">{f.detail}</div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function OverviewTab() {
  const { view } = useReport();
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const bullets = (view.narrative ?? "")
    .split(/\n+/)
    .map((l) => l.replace(/^[•\-*]\s*/, "").trim())
    .filter(Boolean);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {bullets.map((b) => (
              <li key={b} className="flex gap-2">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">Summary written from the computed numbers at the time of analysis; the cards above update live.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Risk flags</CardTitle>
        </CardHeader>
        <CardContent>
          <RiskFlagsList flags={view.flags} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Before you bid</CardTitle>
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
                  {item}
                </label>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Data sources</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(view.dataSources).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground capitalize">{k}</dt>
                <dd className="flex items-center gap-1.5 text-right">
                  <span className={cn(!v.ok && "text-muted-foreground")}>{v.provider}</span>
                  {v.isDemo && <Badge variant="info">Demo</Badge>}
                  {!v.ok && <Badge variant="outline">fallback</Badge>}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
