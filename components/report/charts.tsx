"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";

import type { Comp } from "@/lib/domain/schemas";
import { formatNumber, formatUsd } from "@/lib/utils";

const AXIS_TICK = { fontSize: 11, fill: "var(--muted-foreground)" };

function compactUsd(v: number): string {
  const abs = Math.abs(v);
  const k = Math.round(abs / 100) / 10;
  const s = abs >= 1000 ? `$${Number.isInteger(k) ? k : k.toFixed(1)}k` : `$${Math.round(abs)}`;
  return v < 0 ? `−${s}` : s;
}

function TooltipBox({ children }: { children: React.ReactNode }) {
  return <div className="bg-popover text-popover-foreground rounded-md border px-3 py-2 text-xs shadow-md">{children}</div>;
}

interface WaterfallRow {
  key: string;
  label: string;
  amount: number;
  range: [number, number];
  running: number;
  kind: "resale" | "cost" | "profit";
}

export function toWaterfallRows(rows: { key: string; label: string; amount: number }[]): WaterfallRow[] {
  let running = 0;
  return rows.map((r) => {
    if (r.key === "resale") {
      running = r.amount;
      return { ...r, range: [0, r.amount] as [number, number], running, kind: "resale" as const };
    }
    if (r.key === "profit") {
      return { ...r, range: (r.amount >= 0 ? [0, r.amount] : [r.amount, 0]) as [number, number], running: r.amount, kind: "profit" as const };
    }
    const from = running;
    running += r.amount;
    return { ...r, range: [Math.min(from, running), Math.max(from, running)] as [number, number], running, kind: "cost" as const };
  });
}

const KIND_COLOR = { resale: "var(--series-1)", cost: "var(--series-2)" } as const;

/** Resale → each cost → net profit (expected case at the max bid). */
export function CostWaterfall({ rows }: { rows: { key: string; label: string; amount: number }[] }) {
  const data = toWaterfallRows(rows);
  const height = data.length * 30 + 36;
  return (
    <figure className="space-y-3" aria-label="Cost waterfall from resale value to net profit">
      <div className="text-muted-foreground flex flex-wrap gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: "var(--series-1)" }} /> Resale value
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: "var(--series-2)" }} /> Costs
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: "var(--status-good)" }} /> Net profit
          <span className="text-muted-foreground">(red if a loss)</span>
        </span>
      </div>
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart layout="vertical" data={data} margin={{ top: 0, right: 56, bottom: 0, left: 0 }} barCategoryGap={6}>
            <CartesianGrid horizontal={false} stroke="var(--chart-grid)" strokeWidth={1} />
            <XAxis type="number" tickFormatter={compactUsd} tick={AXIS_TICK} axisLine={{ stroke: "var(--chart-axis)" }} tickLine={false} />
            <YAxis type="category" dataKey="label" width={128} tick={AXIS_TICK} axisLine={false} tickLine={false} interval={0} />
            <Tooltip
              cursor={{ fill: "var(--muted)", opacity: 0.5 }}
              content={({ active, payload }) => {
                const row = active ? (payload?.[0]?.payload as WaterfallRow | undefined) : undefined;
                if (!row) return null;
                return (
                  <TooltipBox>
                    <div className="font-medium">{row.label}</div>
                    <div className="num">{formatUsd(row.amount)}</div>
                    {row.kind === "cost" && <div className="text-muted-foreground">Remaining: {formatUsd(row.running)}</div>}
                  </TooltipBox>
                );
              }}
            />
            <Bar dataKey="range" barSize={16} radius={4} isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.key} fill={d.kind === "profit" ? (d.amount >= 0 ? "var(--status-good)" : "var(--status-critical)") : KIND_COLOR[d.kind]} />
              ))}
              <LabelList
                dataKey="amount"
                content={(props) => {
                  const { x, y, width, height: h, index } = props as { x?: number; y?: number; width?: number; height?: number; index?: number };
                  const row = index !== undefined ? data[index] : undefined;
                  if (!row || row.kind === "cost" || x === undefined || y === undefined || width === undefined || h === undefined) return null;
                  return (
                    <text x={Number(x) + Number(width) + 6} y={Number(y) + Number(h) / 2} dominantBaseline="central" fontSize={11} fill="var(--foreground)">
                      {formatUsd(row.amount)}
                    </text>
                  );
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

/** Comparable listings: asking price vs mileage, with this car's mileage marked. */
export function CompsScatter({ comps, subjectMileage, medianAsking }: { comps: Comp[]; subjectMileage: number | null; medianAsking: number | null }) {
  const data = comps.filter((c) => c.mileage !== null).map((c) => ({ x: c.mileage!, y: c.price, comp: c }));
  if (data.length === 0) return null;
  return (
    <figure className="space-y-2" aria-label="Comparable listings: asking price versus mileage">
      <figcaption className="text-muted-foreground text-xs">Asking price vs. mileage — each dot is a comparable listing</figcaption>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 22, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid stroke="var(--chart-grid)" strokeWidth={1} />
            <XAxis
              type="number"
              dataKey="x"
              name="Mileage"
              tickFormatter={(v: number) => `${Math.round(v / 1000)}k mi`}
              tick={AXIS_TICK}
              axisLine={{ stroke: "var(--chart-axis)" }}
              tickLine={false}
              domain={["dataMin - 5000", "dataMax + 5000"]}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Price"
              tickFormatter={compactUsd}
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
              width={52}
              domain={["auto", "auto"]}
            />
            {medianAsking !== null && (
              <ReferenceLine
                y={medianAsking}
                stroke="var(--muted-foreground)"
                strokeWidth={1}
                label={{ value: `Median ${compactUsd(medianAsking)}`, position: "insideTopRight", fontSize: 11, fill: "var(--muted-foreground)" }}
              />
            )}
            {subjectMileage !== null && (
              <ReferenceLine
                x={subjectMileage}
                stroke="var(--foreground)"
                strokeWidth={1.5}
                label={{ value: "This car", position: "top", fontSize: 11, fill: "var(--foreground)" }}
              />
            )}
            <Tooltip
              cursor={false}
              content={({ active, payload }) => {
                const p = active ? (payload?.[0]?.payload as { comp: Comp } | undefined) : undefined;
                if (!p) return null;
                const c = p.comp;
                return (
                  <TooltipBox>
                    <div className="num font-medium">{formatUsd(c.price)}</div>
                    <div>
                      {formatNumber(c.mileage)} mi{c.year ? ` · ${c.year}` : ""}
                    </div>
                    <div className="text-muted-foreground">
                      {[c.city, c.state].filter(Boolean).join(", ")}
                      {c.distanceMiles !== null ? ` · ${c.distanceMiles} mi away` : ""}
                    </div>
                    <div className="text-muted-foreground">Adjusted to this car: {formatUsd(c.adjustedPrice)}</div>
                  </TooltipBox>
                );
              }}
            />
            <Scatter data={data} fill="var(--series-1)" stroke="var(--card)" strokeWidth={2} isAnimationActive={false} shape="circle" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
