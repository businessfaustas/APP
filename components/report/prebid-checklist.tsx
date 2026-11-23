"use client";

import { useState, type ReactNode } from "react";

import { countKinds, STEP_KINDS, stepKind, type StepKind } from "@/lib/flags/checklistKinds";
import { trText } from "@/lib/i18n/generated";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

const KIND_COLOR: Record<StepKind, string> = {
  inspect: "var(--primary)",
  paperwork: "var(--go)",
  money: "var(--caution)",
  logistics: "oklch(0.62 0.18 305)",
};

const KIND_KEY = {
  inspect: "report.kindInspect",
  paperwork: "report.kindPaperwork",
  money: "report.kindMoney",
  logistics: "report.kindLogistics",
} as const;

/** Tiny pictures for the four kinds of step (24-unit grid, drawn with the current colour). */
function Glyph({ kind, className }: { kind: StepKind; className?: string }) {
  const body: Record<StepKind, ReactNode> = {
    inspect: (
      <>
        <circle cx={10.5} cy={10.5} r={5.8} />
        <path d="m15 15 5.5 5.5" />
        <path d="M8 10.5h5M10.5 8v5" opacity={0.6} />
      </>
    ),
    paperwork: (
      <>
        <path d="M6 3h8l4.5 4.5V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
        <path d="m8.8 13.4 2.4 2.4 4-4.6" />
      </>
    ),
    money: (
      <>
        <ellipse cx={12} cy={6.5} rx={7} ry={3} />
        <path d="M5 6.5v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5M5 11.5v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" />
      </>
    ),
    logistics: (
      <>
        <path d="M2.5 6.5h11.5v10H2.5zM14 9.5h4l3 3.2v3.8h-7" />
        <circle cx={7} cy={17.5} r={2} fill="var(--card)" />
        <circle cx={17.5} cy={17.5} r={2} fill="var(--card)" />
      </>
    ),
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("size-4", className)}
    >
      {body[kind]}
    </svg>
  );
}

/**
 * "Before you bid" as a boarding pass: a stub on the left with a progress ring and a stamp that lands when every step
 * is ticked, a perforated edge, and the steps on a timeline, each tagged by the kind of job it is.
 */
export function PreBidChecklist({ items }: { items: string[] }) {
  const t = useT();
  const [done, setDone] = useState<Set<number>>(new Set());
  if (items.length === 0) return null;

  const total = items.length;
  const count = done.size;
  const complete = count === total;
  const R = 42;
  const C = 2 * Math.PI * R;
  const kinds = items.map(stepKind);
  const counts = countKinds(items);
  const left = Object.fromEntries(STEP_KINDS.map((k) => [k, 0])) as Record<StepKind, number>;
  items.forEach((_, i) => {
    if (!done.has(i)) left[kinds[i]!]++;
  });

  const toggle = (i: number, on: boolean) =>
    setDone((s) => {
      const n = new Set(s);
      if (on) n.add(i);
      else n.delete(i);
      return n;
    });

  return (
    <section
      aria-labelledby="prebid-title"
      className={cn(
        "surface bg-card relative overflow-hidden rounded-3xl border transition-shadow duration-500 md:grid md:grid-cols-[17rem_1fr]",
        complete && "shadow-[0_0_0_1px_color-mix(in_oklab,var(--go)_55%,transparent),0_18px_50px_-22px_color-mix(in_oklab,var(--go)_60%,transparent)]",
      )}
    >
      {/* the stub */}
      <div
        className={cn(
          "relative flex items-center gap-5 border-b border-dashed p-6 md:flex-col md:items-start md:justify-between md:gap-7 md:border-r md:border-b-0 md:p-7",
          "bg-[radial-gradient(120%_90%_at_0%_0%,color-mix(in_oklab,var(--primary)_16%,transparent),transparent_70%)]",
          "before:bg-background before:absolute before:-bottom-3 before:-left-3 before:size-6 before:rounded-full before:border md:before:-top-3 md:before:right-[-0.75rem] md:before:bottom-auto md:before:left-auto",
          "after:bg-background after:absolute after:-right-3 after:-bottom-3 after:size-6 after:rounded-full after:border md:after:right-[-0.75rem]",
        )}
      >
        <div className="min-w-0 space-y-1.5">
          <div className="eyebrow">{t("report.stepsN", { n: total })}</div>
          <h2 id="prebid-title" className="display text-2xl leading-tight font-semibold tracking-tight md:text-[1.75rem]">
            {t("report.beforeYouBid")}
          </h2>
        </div>

        <div className="relative ml-auto size-24 shrink-0 md:mx-0 md:size-28">
          <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden="true">
            <circle cx={50} cy={50} r={R} fill="none" stroke="color-mix(in oklab, var(--foreground) 13%, transparent)" strokeWidth={9} />
            <circle
              cx={50}
              cy={50}
              r={R}
              fill="none"
              stroke={complete ? "var(--go)" : "var(--primary)"}
              strokeWidth={9}
              strokeLinecap="round"
              strokeDasharray={`${(C * count) / total} ${C}`}
              className="transition-[stroke-dasharray,stroke] duration-500 ease-out"
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div className="display leading-none">
              <span className="text-3xl font-semibold tabular-nums md:text-4xl">{count}</span>
              <span className="text-muted-foreground text-lg font-medium tabular-nums">/{total}</span>
            </div>
          </div>
        </div>

        <div className="hidden w-full min-w-0 space-y-3 md:block">
          {complete ? (
            <div
              key="stamp"
              className="stamp border-go text-go inline-flex items-center gap-2 rounded-lg border-2 px-3 py-1.5 text-sm font-bold tracking-[0.14em] uppercase"
            >
              <Glyph kind="paperwork" className="size-4" /> {t("report.readyToBid")}
            </div>
          ) : (
            <div className="text-muted-foreground text-sm font-medium">{t("report.stepsLeft", { n: total - count })}</div>
          )}
          <ul className="space-y-1.5" aria-hidden="true">
            {STEP_KINDS.filter((k) => counts[k] > 0).map((k) => (
              <li key={k} className="flex items-center gap-2 text-xs" style={{ color: `color-mix(in oklab, ${KIND_COLOR[k]} 62%, var(--foreground))` }}>
                <Glyph kind={k} className="size-3.5" />
                <span className="font-medium">{t(KIND_KEY[k])}</span>
                <span className="ml-auto font-mono tabular-nums opacity-80">
                  {counts[k] - left[k]}/{counts[k]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* the steps */}
      <div className="p-4 sm:p-6 md:py-7 md:pr-8 md:pl-6">
        <p className="text-muted-foreground mb-3 flex items-center justify-between gap-3 px-2.5 text-sm">
          <span>{t("report.tickHint")}</span>
          <span className="md:hidden" aria-hidden="true">
            {complete ? (
              <span className="stamp border-go text-go inline-block rounded-md border-2 px-2 py-0.5 text-xs font-bold tracking-widest uppercase">
                {t("report.readyToBid")}
              </span>
            ) : (
              t("report.stepsLeft", { n: total - count })
            )}
          </span>
        </p>
        <p className="sr-only" role="status" aria-live="polite">
          {t("report.doneOf", { done: count, total })}
        </p>
        <ol className="relative" data-testid="checklist">
          {items.map((item, i) => {
            const kind = kinds[i]!;
            const on = done.has(i);
            return (
              <li key={item} className="relative">
                {i < total - 1 && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute top-12 -bottom-1 left-[1.75rem] w-0.5 -translate-x-1/2 rounded-full transition-colors duration-500",
                      on ? "bg-go/70" : "bg-border",
                    )}
                  />
                )}
                <input id={`chk-${i}`} type="checkbox" className="peer sr-only" checked={on} onChange={(e) => toggle(i, e.target.checked)} />
                <label
                  htmlFor={`chk-${i}`}
                  className="hover:bg-muted/60 peer-focus-visible:ring-ring flex cursor-pointer items-start gap-4 rounded-2xl p-2.5 pr-3 transition-colors peer-focus-visible:ring-2"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "relative grid size-9 shrink-0 place-items-center rounded-full border-2 font-mono text-xs font-semibold transition-all duration-300",
                      on ? "bg-go border-go scale-105 text-white" : "bg-card text-muted-foreground border-border",
                    )}
                  >
                    {on ? (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={3}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="size-4"
                      >
                        <path d="m5 12.5 4.5 4.5L19 7.5" />
                      </svg>
                    ) : (
                      String(i + 1).padStart(2, "0")
                    )}
                  </span>
                  <span className="min-w-0 flex-1 space-y-1 pt-0.5">
                    <span
                      className="inline-flex items-center gap-1.5 text-[0.68rem] font-semibold tracking-[0.12em] uppercase"
                      style={{ color: `color-mix(in oklab, ${KIND_COLOR[kind]} 62%, var(--foreground))` }}
                    >
                      <Glyph kind={kind} className="size-3.5" />
                      {t(KIND_KEY[kind])}
                    </span>
                    <span className={cn("block text-sm leading-snug transition-colors", on && "text-muted-foreground line-through decoration-1")}>
                      {trText(t, item)}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
