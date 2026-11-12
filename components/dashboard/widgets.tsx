"use client";

import { CircleCheckIcon, OctagonXIcon, TriangleAlertIcon } from "lucide-react";
import Link from "next/link";

import { CountTo } from "@/components/motion/count-to";
import { DayColumns, SegmentedBar, type Part } from "@/components/report/viz";
import { VerdictBadge } from "@/components/report/verdict-badge";
import { Badge } from "@/components/ui/badge";
import { CarVisual } from "@/components/vehicle/car-art";
import type { LotVisual } from "@/lib/analysis/visual";
import { useT } from "@/lib/i18n/client";
import { cn, formatUsd } from "@/lib/utils";

type Fmt = "int" | "usd";
const FORMAT: Record<Fmt, (n: number) => string> = {
  int: (n) => String(n),
  usd: formatUsd,
};

/** A dashboard number: counts up from zero when the page opens. */
export function KpiTile({
  icon,
  label,
  value,
  format = "int",
  sub,
  tone,
  href,
  index = 0,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | null;
  format?: Fmt;
  sub?: string;
  tone?: "go" | "brand" | "caution";
  href?: string;
  index?: number;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="eyebrow">{label}</span>
        <span
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-lg [&_svg]:size-4",
            tone === "go" ? "bg-go-soft text-go" : tone === "caution" ? "bg-caution-soft text-caution" : "bg-primary/12 text-primary",
          )}
          aria-hidden="true"
        >
          {icon}
        </span>
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight">{value === null ? "—" : <CountTo value={value} from={0} format={FORMAT[format]} />}</div>
      {sub && <div className="text-muted-foreground mt-1 text-xs">{sub}</div>}
    </>
  );
  const cls = "rise bg-card block rounded-2xl border p-5";
  const style = { ["--i" as string]: index } as React.CSSProperties;
  return href ? (
    <Link href={href} className={cn(cls, "hover:border-primary/40 transition-colors")} style={style}>
      {body}
    </Link>
  ) : (
    <div className={cls} style={style}>
      {body}
    </div>
  );
}

/** Analyses per day for the last two weeks. */
export function ActivityChart({ days }: { days: { date: string; label: string; count: number }[] }) {
  const t = useT();
  return <DayColumns days={days} ariaLabel={t("dash.activitySub")} valueLabel={(n) => t("dash.analysesN", { n })} />;
}

const VERDICTS = [
  { key: "GO", color: "var(--go)", Icon: CircleCheckIcon, cls: "text-go" },
  { key: "BE_CAUTIOUS", color: "var(--caution)", Icon: TriangleAlertIcon, cls: "text-caution" },
  { key: "WALK_AWAY", color: "var(--stop)", Icon: OctagonXIcon, cls: "text-stop" },
] as const;

/** How the finished reports split between GO, caution and walk away. */
export function VerdictMix({ counts }: { counts: Partial<Record<"GO" | "BE_CAUTIOUS" | "WALK_AWAY", number>> }) {
  const t = useT();
  const total = VERDICTS.reduce((a, v) => a + (counts[v.key] ?? 0), 0);
  if (total === 0) return <p className="text-muted-foreground text-sm">{t("dash.noData")}</p>;
  const parts: Part[] = VERDICTS.map((v) => ({ key: v.key, label: t(`domain.verdict.${v.key}`), value: counts[v.key] ?? 0, color: v.color }));
  return (
    <div className="space-y-4">
      <SegmentedBar parts={parts} format={(n) => t("dash.analysesN", { n })} short={() => ""} ariaLabel={t("dash.verdictMix")} legend={false} />
      <ul className="space-y-2.5 text-sm">
        {VERDICTS.map((v) => {
          const n = counts[v.key] ?? 0;
          return (
            <li key={v.key} className="flex items-center gap-2.5">
              <v.Icon className={cn("size-4 shrink-0", v.cls)} aria-hidden="true" />
              <span className="flex-1">{t(`domain.verdict.${v.key}`)}</span>
              <span className="num text-muted-foreground text-xs">{Math.round((n / total) * 100)}%</span>
              <span className="num w-8 text-right font-medium">{n}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export interface LotCardData {
  id: string;
  title: string;
  meta: string;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";
  needsInput: boolean;
  verdict: "GO" | "BE_CAUTIOUS" | "WALK_AWAY" | null;
  maxBid: number | null;
  dealScore: number | null;
  visual: LotVisual;
}

/** A recent lot as a picture card: the car, its verdict and the number that matters. */
export function LotCard({ lot, index = 0 }: { lot: LotCardData; index?: number }) {
  const t = useT();
  return (
    <Link
      href={`/app/analyses/${lot.id}`}
      className="rise group bg-card hover:border-primary/40 block overflow-hidden rounded-2xl border transition-[border-color,box-shadow] hover:shadow-lg"
      style={{ ["--i" as string]: index }}
      data-testid="lot-card"
    >
      <div className="relative">
        <CarVisual
          {...lot.visual}
          label={lot.title}
          scanning={lot.status === "RUNNING" || lot.status === "QUEUED"}
          className="aspect-[16/9] w-full transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <div className="absolute top-3 left-3">
          {lot.status === "COMPLETED" && lot.verdict ? (
            <VerdictBadge verdict={lot.verdict} />
          ) : lot.status === "FAILED" ? (
            <Badge variant="stop">{t("dash.failed")}</Badge>
          ) : lot.needsInput ? (
            <Badge variant="caution">{t("dash.needsDetails")}</Badge>
          ) : (
            <Badge variant="info">{t("dash.running")}</Badge>
          )}
        </div>
        {lot.dealScore !== null && lot.status === "COMPLETED" && (
          <span className="bg-background/85 num absolute top-3 right-3 rounded-full px-2 py-0.5 text-xs font-semibold backdrop-blur">{lot.dealScore}</span>
        )}
      </div>
      <div className="flex items-end justify-between gap-3 p-4">
        <div className="min-w-0">
          <div className="truncate font-medium">{lot.title}</div>
          <div className="text-muted-foreground truncate text-xs">{lot.meta}</div>
        </div>
        {lot.status === "COMPLETED" && (
          <div className="shrink-0 text-right">
            <div className="text-muted-foreground text-[11px]">{t("report.max")}</div>
            <div className="num font-semibold">{lot.maxBid !== null ? formatUsd(lot.maxBid) : "—"}</div>
          </div>
        )}
      </div>
    </Link>
  );
}
