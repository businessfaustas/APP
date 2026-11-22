"use client";

/**
 * Small, animated data figures built from plain HTML (no chart library): they stay crisp,
 * theme with the CSS tokens and animate with the shared motion classes.
 */
import { cn } from "@/lib/utils";

export interface Part {
  key: string;
  label: string;
  value: number;
  /** CSS colour (a token), e.g. "var(--series-1)". */
  color: string;
  /** Text colour inside the block; white unless the fill is light. */
  ink?: string;
}

/**
 * One whole split into parts: a tall segmented bar (each block's rounded amount printed on it
 * when it fits), with a legend of names underneath. Hover/focus gives each part's full figure.
 */
export function SegmentedBar({
  parts,
  format,
  short,
  ariaLabel,
  legend = true,
}: {
  parts: Part[];
  format: (n: number) => string;
  short: (n: number) => string;
  ariaLabel: string;
  /** Off when the caller renders its own legend (e.g. a table with swatches). */
  legend?: boolean;
}) {
  const shown = parts.filter((p) => p.value > 0);
  const total = shown.reduce((a, p) => a + p.value, 0) || 1;
  return (
    <figure className="space-y-3" aria-label={ariaLabel}>
      <div className="grow-x flex h-7 w-full gap-0.5" role="list">
        {shown.map((p) => {
          const share = p.value / total;
          return (
            <div
              key={p.key}
              role="listitem"
              tabIndex={0}
              title={`${p.label}: ${format(p.value)} (${Math.round(share * 100)}%)`}
              aria-label={`${p.label}: ${format(p.value)}, ${Math.round(share * 100)}%`}
              className="flex min-w-1 items-center overflow-hidden rounded-[4px] px-2 outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
              style={{ flexGrow: p.value, flexBasis: 0, background: p.color, color: p.ink ?? "#0b0b0f" }}
            >
              {share >= 0.12 && <span className="text-xs font-semibold whitespace-nowrap">{short(p.value)}</span>}
            </div>
          );
        })}
      </div>
      {legend && (
        <figcaption className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
          {shown.map((p) => (
            <span key={p.key} className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px]" style={{ background: p.color }} aria-hidden="true" />
              {p.label}
            </span>
          ))}
        </figcaption>
      )}
    </figure>
  );
}

export interface SignedRow {
  key: string;
  label: string;
  value: number;
  emphasis?: boolean;
}

/**
 * Signed horizontal bars about a zero line: gains in the series hue, losses in the critical
 * status colour, the value printed just past each bar's tip (gutters keep it inside the card).
 */
export function SignedBars({ rows, format, ariaLabel }: { rows: SignedRow[]; format: (n: number) => string; ariaLabel: string }) {
  const lo = Math.min(0, ...rows.map((r) => r.value));
  const hi = Math.max(0, ...rows.map((r) => r.value));
  const span = hi - lo || 1;
  const zero = (-lo / span) * 100;
  return (
    <figure className="space-y-3.5" aria-label={ariaLabel}>
      {rows.map((r, i) => {
        const w = (Math.abs(r.value) / span) * 100;
        const neg = r.value < 0;
        return (
          <div key={r.key} className="grid grid-cols-[5.5rem_1fr] items-center gap-3 text-sm">
            <span className={cn("truncate", r.emphasis ? "font-semibold" : "text-muted-foreground")}>{r.label}</span>
            <div className="relative h-7">
              <div className="absolute inset-y-0" style={{ left: lo < 0 ? "4.25rem" : 0, right: hi > 0 ? "4.25rem" : 0 }}>
                <div className="bg-chart-axis absolute inset-y-0 w-px" style={{ left: `${zero}%` }} aria-hidden="true" />
                <div
                  className={cn("grow-x absolute top-1/2 h-5 -translate-y-1/2", neg ? "rounded-l-[4px]" : "rounded-r-[4px]")}
                  style={{
                    left: neg ? `${zero - w}%` : `${zero}%`,
                    width: `${Math.max(w, 0.5)}%`,
                    background: neg ? "var(--status-critical)" : "var(--series-1)",
                    transformOrigin: neg ? "right center" : "left center",
                    ["--i" as string]: i,
                  }}
                  title={`${r.label}: ${format(r.value)}`}
                />
                <span
                  className={cn(
                    "num absolute top-1/2 -translate-y-1/2 px-1.5 text-xs font-semibold whitespace-nowrap",
                    r.emphasis ? "text-foreground" : "text-muted-foreground",
                  )}
                  style={neg ? { right: `${100 - zero + w}%` } : { left: `${zero + w}%` }}
                >
                  {format(r.value)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </figure>
  );
}

/** One series over days: columns from a shared baseline, thin and rounded at the top. */
export function DayColumns({
  days,
  ariaLabel,
  valueLabel,
}: {
  days: { date: string; label: string; count: number }[];
  ariaLabel: string;
  valueLabel: (n: number) => string;
}) {
  const max = Math.max(1, ...days.map((d) => d.count));
  return (
    <figure aria-label={ariaLabel} className="space-y-2">
      <div className="border-chart-axis flex h-28 items-end gap-1.5 border-b">
        {days.map((d, i) => (
          <div key={d.date} className="group relative flex h-full flex-1 items-end justify-center" title={`${d.label}: ${valueLabel(d.count)}`}>
            <div
              className="grow-y w-full max-w-6 rounded-t-lg"
              style={{ height: d.count ? `${(d.count / max) * 100}%` : 0, background: "var(--brand-bar)", ["--i" as string]: i }}
            />
            {d.count > 0 && (
              <span className="bg-popover text-popover-foreground pointer-events-none absolute -top-7 hidden rounded-md border px-1.5 py-0.5 text-[11px] whitespace-nowrap shadow-sm group-hover:block">
                {valueLabel(d.count)}
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="text-muted-foreground flex justify-between text-[11px]">
        <span>{days[0]?.label}</span>
        <span>{days.at(-1)?.label}</span>
      </div>
    </figure>
  );
}
