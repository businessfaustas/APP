import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { monitoringSnapshot } from "@/lib/admin/monitoring";
import { env } from "@/lib/config/env";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Monitoring · Admin" };
export const dynamic = "force-dynamic";

/** Core Web Vitals "good" thresholds (p75), from web.dev. */
const VITAL_GOOD: Record<string, { good: number; unit: string }> = {
  LCP: { good: 2500, unit: "ms" },
  INP: { good: 200, unit: "ms" },
  CLS: { good: 0.1, unit: "" },
  FCP: { good: 1800, unit: "ms" },
  TTFB: { good: 800, unit: "ms" },
};

export default async function MonitoringPage() {
  const { errors, errors24, spend, vitals, events, topPages, limitHits, stripeEvents } = await monitoringSnapshot();
  const e = env();
  const maintenance = ["1", "true", "yes", "on"].includes(process.env.MAINTENANCE_MODE?.trim().toLowerCase() ?? "");
  const pct = (spent: number, cap: number) => (cap > 0 ? Math.min(100, Math.round((spent / cap) * 100)) : 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Errors in the last 24 h" value={String(errors24)} tone={errors24 > 0 ? "warn" : "ok"} />
        <Stat
          label="AI spend today"
          value={`$${spend.day.toFixed(2)}`}
          sub={e.AI_DAILY_BUDGET_USD > 0 ? `${pct(spend.day, e.AI_DAILY_BUDGET_USD)}% of $${e.AI_DAILY_BUDGET_USD}` : "no cap"}
        />
        <Stat
          label="AI spend this month"
          value={`$${spend.month.toFixed(2)}`}
          sub={e.AI_MONTHLY_BUDGET_USD > 0 ? `${pct(spend.month, e.AI_MONTHLY_BUDGET_USD)}% of $${e.AI_MONTHLY_BUDGET_USD}` : "no cap"}
        />
        <Stat
          label="Maintenance mode"
          value={maintenance ? "ON" : "off"}
          tone={maintenance ? "warn" : "ok"}
          sub="MAINTENANCE_MODE=true takes the app offline"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Open errors</CardTitle>
          <CardDescription>Grouped by cause. The same problem repeating is one row with a count.</CardDescription>
        </CardHeader>
        <CardContent>
          {errors.length === 0 ? (
            <p className="text-muted-foreground text-sm">No open errors. Nothing has gone wrong that we know of.</p>
          ) : (
            <ul className="divide-y">
              {errors.map((g) => (
                <li key={g.fingerprint} className="space-y-1 py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{g.source}</Badge>
                    <span className="font-medium break-words">{g.message}</span>
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {g.count}× · last {formatDateTime(g.lastSeen)} · first {formatDateTime(g.firstSeen)}
                    {g.path ? ` · ${g.path}` : ""}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Page speed (last 7 days, p75)</CardTitle>
            <CardDescription>Real visitors who allowed analytics. Green means &ldquo;good&rdquo; by Google&apos;s thresholds.</CardDescription>
          </CardHeader>
          <CardContent>
            {vitals.length === 0 ? (
              <p className="text-muted-foreground text-sm">No samples yet. They appear once visitors allow analytics.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {vitals.map((v) => {
                  const t = VITAL_GOOD[v.name];
                  const good = t ? v.p75 <= t.good : true;
                  return (
                    <li key={v.name} className="flex items-center justify-between">
                      <span>{v.name}</span>
                      <span className="flex items-center gap-2">
                        <span className="tabular-nums">
                          {v.name === "CLS" ? v.p75.toFixed(3) : Math.round(v.p75)}
                          {t?.unit}
                        </span>
                        <Badge variant={good ? "go" : "outline"}>{good ? "good" : "slow"}</Badge>
                        <span className="text-muted-foreground text-xs">{Number(v.samples)} samples</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Product analytics (last 7 days)</CardTitle>
            <CardDescription>Anonymous events from visitors who allowed analytics.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {events.length === 0 ? (
              <p className="text-muted-foreground text-sm">No events yet.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {events.map((ev) => (
                  <li key={ev.name} className="flex justify-between">
                    <span>{ev.name.replace(/_/g, " ")}</span>
                    <span className="tabular-nums">{ev._count._all}</span>
                  </li>
                ))}
              </ul>
            )}
            {topPages.length > 0 && (
              <div>
                <div className="mb-1.5 text-sm font-medium">Top pages</div>
                <ul className="text-muted-foreground space-y-1 text-xs">
                  {topPages.map((p) => (
                    <li key={p.path} className="flex justify-between">
                      <span className="truncate">{p.path}</span>
                      <span className="tabular-nums">{p._count._all}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <div>Rate-limit counters in the last hour: {limitHits}</div>
          <div>Stripe events handled in the last 24 h: {stripeEvents}</div>
          <div>Environment: {process.env.VERCEL_ENV ?? e.NODE_ENV}</div>
          <div>Release: {process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local"}</div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "ok" | "warn" }) {
  return (
    <Card className="gap-1 py-4">
      <CardContent className="px-5">
        <div className="text-muted-foreground text-xs">{label}</div>
        <div className={`text-2xl font-semibold tabular-nums ${tone === "warn" ? "text-caution" : ""}`}>{value}</div>
        {sub && <div className="text-muted-foreground text-xs">{sub}</div>}
      </CardContent>
    </Card>
  );
}
