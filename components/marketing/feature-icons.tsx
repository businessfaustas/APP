import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * FlagBid's own icon set: two-tone drawings on a 48-unit grid, each one a small picture of the thing it stands for
 * (a receipt with a wrench, a ship carrying containers, a shield against the flood) instead of a generic outline glyph.
 * Strokes take the current text colour; soft fills use the same colour at low opacity; one small detail per icon
 * uses a warm amber accent so the set reads as a family. Decorative: always aria-hidden.
 */
const ACCENT = "var(--icon-accent, #dd9a0b)";
/** Matches the plate behind the icon, so a shape drawn over another one hides what is under it. */
const BG = "var(--icon-bg, var(--card, #fff))";

function Svg({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={cn("size-full", className)}
    >
      {children}
    </svg>
  );
}

const soft = { fill: "currentColor", fillOpacity: 0.16, stroke: "none" } as const;
const spark = { fill: ACCENT, stroke: "none" } as const;

/** A repair estimate: a torn-off receipt with line items and a wrench across the corner. */
function Estimate({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M10 8a3 3 0 0 1 3-3h17a3 3 0 0 1 3 3v33l-3.4-2.6-3.3 2.6-3.3-2.6-3.3 2.6-3.4-2.6L10 41Z" {...soft} />
      <path d="M10 8a3 3 0 0 1 3-3h17a3 3 0 0 1 3 3v33l-3.4-2.6-3.3 2.6-3.3-2.6-3.3 2.6-3.4-2.6L10 41Z" />
      <path d="M15.5 17.5h11M15.5 23h7M15.5 28.5h5" />
      <path d="M15.5 12h6" strokeWidth={3.4} stroke={ACCENT} />
      <circle cx={36} cy={15} r={7.8} fill={BG} stroke="none" />
      <path d="m31 20.2-16.2 16.2" strokeWidth={4.6} />
      <path d="M42.3 13.3A6.5 6.5 0 1 1 37.7 8.7" strokeWidth={3.2} />
    </Svg>
  );
}

/** Market value from similar cars: a scatter of sold prices, a trend line and the target car circled. */
function Market({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M8 7v33h33" />
      <path d="M13 34 38 14" strokeDasharray="1 4.6" />
      {[
        [14, 30],
        [19, 33],
        [22, 25],
        [27, 29],
        [34, 15.5],
        [38, 21],
        [16, 24],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={2.2} fill="currentColor" fillOpacity={0.55} stroke="none" />
      ))}
      <circle cx={28.5} cy={21.5} r={6.6} {...soft} />
      <circle cx={28.5} cy={21.5} r={6.6} stroke={ACCENT} strokeWidth={2.4} />
      <circle cx={28.5} cy={21.5} r={2.6} {...spark} />
    </Svg>
  );
}

/** Risks: a shield with flood water rising inside it and a warning mark above the waterline. */
function Risk({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M24 4.5 39 10v12.3c0 9.4-6.4 16.6-15 20.7-8.6-4.1-15-11.3-15-20.7V10Z" {...soft} />
      <path d="M24 4.5 39 10v12.3c0 9.4-6.4 16.6-15 20.7-8.6-4.1-15-11.3-15-20.7V10Z" />
      <path d="M24 13v6.2" strokeWidth={2.8} />
      <circle cx={24} cy={23.6} r={1.6} {...spark} />
      <path d="M14.5 30.2q2.4-2.6 4.8 0t4.7 0 4.8 0 4.7 0" />
      <path d="M17.5 35.2q2.2-2.4 4.4 0t4.4 0 4.2 0" opacity={0.55} />
    </Svg>
  );
}

/** What-if sliders: three rails with knobs at different positions; one knob is the one you are moving. */
function WhatIf({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      {[
        [13, 31],
        [24, 15],
        [35, 33],
      ].map(([y, x]) => (
        <g key={y}>
          <path d={`M8 ${y}h32`} opacity={0.4} />
          <path d={`M8 ${y}h${x! - 8}`} strokeWidth={3.4} />
        </g>
      ))}
      <circle cx={31} cy={13} r={4.6} fill={BG} />
      <circle cx={31} cy={13} r={4.6} />
      <circle cx={15} cy={24} r={5.4} {...spark} />
      <circle cx={15} cy={24} r={5.4} stroke={ACCENT} />
      <circle cx={33} cy={35} r={4.6} fill={BG} />
      <circle cx={33} cy={35} r={4.6} />
      <path d="M41 6.5v4M39 8.5h4" opacity={0.7} />
    </Svg>
  );
}

/** Comparing lots: three auction cards fanned like a hand, the front one scored. */
function Compare({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <g transform="rotate(-13 24 42)">
        <rect x={10} y={6} width={22} height={32} rx={3.4} {...soft} />
        <rect x={10} y={6} width={22} height={32} rx={3.4} opacity={0.55} />
      </g>
      <g transform="rotate(11 24 42)">
        <rect x={16} y={6} width={22} height={32} rx={3.4} {...soft} />
        <rect x={16} y={6} width={22} height={32} rx={3.4} opacity={0.75} />
      </g>
      <rect x={13} y={9} width={22} height={32} rx={3.4} fill={BG} />
      <rect x={13} y={9} width={22} height={32} rx={3.4} />
      <path d="M17.5 31.5h13M17.5 36h7" />
      <path d="M17.5 27a6.5 6.5 0 0 1 13 0" strokeWidth={2.6} />
      <path d="m24 27 3.2-5" stroke={ACCENT} strokeWidth={2.6} />
      <circle cx={24} cy={27} r={1.5} {...spark} />
    </Svg>
  );
}

/** Reminders for watched lots: a bell with sound waves and a small clock for the auction time. */
function Reminder({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M22 6.5c-6 0-10 4.6-10 10.5v6.5L8.5 29h27l-3.5-5.5V17c0-5.9-4-10.5-10-10.5Z" {...soft} />
      <path d="M22 6.5c-6 0-10 4.6-10 10.5v6.5L8.5 29h27l-3.5-5.5V17c0-5.9-4-10.5-10-10.5Z" />
      <path d="M17.5 33.5a4.6 4.6 0 0 0 9 0" />
      <path d="M22 3.5v3" />
      <path d="M4.5 15.5A19 19 0 0 1 8 8M39.5 8a19 19 0 0 1 3.5 7.5" opacity={0.55} />
      <circle cx={36.5} cy={34.5} r={8} fill={BG} />
      <circle cx={36.5} cy={34.5} r={8} stroke={ACCENT} />
      <path d="M36.5 29.6v5.2l3.4 2" stroke={ACCENT} />
    </Svg>
  );
}

/** Export mode: a cargo ship carrying containers, one of them picked out in the accent colour. */
function Export({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <rect x={12} y={20} width={9} height={9} rx={1.4} {...soft} />
      <rect x={12} y={20} width={9} height={9} rx={1.4} />
      <rect x={21.5} y={20} width={9} height={9} rx={1.4} {...spark} fillOpacity={0.85} />
      <rect x={17} y={11} width={9} height={9} rx={1.4} {...soft} />
      <rect x={17} y={11} width={9} height={9} rx={1.4} />
      <path d="M33 29V16h4.6l2.6 5v8" />
      <path d="M4.5 29.5h39l-4.6 8.8H9.8Z" {...soft} />
      <path d="M4.5 29.5h39l-4.6 8.8H9.8Z" />
      <path d="M3.5 43q3-2.4 6 0t6 0 6 0 6 0 6 0 6 0" opacity={0.55} />
    </Svg>
  );
}

/** PDF and share links: a document with a folded corner and a chain link clipped onto it. */
function Share({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M12 5h16l9 9v26a3 3 0 0 1-3 3H12a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3Z" {...soft} />
      <path d="M12 5h16l9 9v26a3 3 0 0 1-3 3H12a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3Z" />
      <path d="M28 5v9h9" />
      <path d="M15 21h12M15 26.5h6" />
      <rect x={16} y={32.5} width={14} height={8.4} rx={4.2} fill={BG} />
      <rect x={16} y={32.5} width={14} height={8.4} rx={4.2} />
      <rect x={25} y={29.5} width={14} height={8.4} rx={4.2} fill={BG} fillOpacity={0} stroke={ACCENT} />
      <path d="M26 36.7h4" stroke={ACCENT} />
    </Svg>
  );
}

/** Browser extension: a browser window with a puzzle piece snapping into the toolbar corner. */
function Extension({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <rect x={4.5} y={9} width={39} height={30} rx={4.4} {...soft} />
      <rect x={4.5} y={9} width={39} height={30} rx={4.4} />
      <path d="M4.5 17.6h39" />
      <circle cx={9.6} cy={13.3} r={1.1} fill="currentColor" stroke="none" />
      <circle cx={13.8} cy={13.3} r={1.1} fill="currentColor" stroke="none" />
      <path d="M9.5 25h13M9.5 30.5h8" opacity={0.6} />
      <path d="M27.5 22.5h4.3a3 3 0 1 1 5.6 0h3.1v4.4a3 3 0 1 1 0 5.6v4h-13z" fill={BG} />
      <path d="M27.5 22.5h4.3a3 3 0 1 1 5.6 0h3.1v4.4a3 3 0 1 1 0 5.6v4h-13Z" {...spark} fillOpacity={0.35} />
      <path d="M27.5 22.5h4.3a3 3 0 1 1 5.6 0h3.1v4.4a3 3 0 1 1 0 5.6v4h-13Z" stroke={ACCENT} />
    </Svg>
  );
}

/** How it works, step 1: paste the auction link (a chain link with a click). */
function Paste({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <rect x={5} y={17} width={21} height={12} rx={6} {...soft} />
      <rect x={5} y={17} width={21} height={12} rx={6} />
      <rect x={20} y={17} width={21} height={12} rx={6} fill={BG} fillOpacity={0} />
      <rect x={20} y={17} width={21} height={12} rx={6} stroke={ACCENT} />
      <path d="M18.5 23h11" />
      <path d="M33 33.5 37 44l2.6-4.4 4.4-2.6Z" fill="currentColor" stroke="currentColor" strokeWidth={1.4} />
      <path d="M31 6.5v4M24.5 8.4l2.4 2.8M37.5 8.4l-2.4 2.8" opacity={0.7} />
    </Svg>
  );
}

/** How it works, step 2: a scan line passing over a car inside viewfinder corners. */
function Scan({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M6 15V9a3 3 0 0 1 3-3h6M33 6h6a3 3 0 0 1 3 3v6M42 33v6a3 3 0 0 1-3 3h-6M15 42H9a3 3 0 0 1-3-3v-6" />
      <path d="M11 29.5v-3.2l3.4-.9 4.3-4.6h9.6l4.2 4.6 3 .9v3.2Z" {...soft} />
      <path d="M11 29.5v-3.2l3.4-.9 4.3-4.6h9.6l4.2 4.6 3 .9v3.2" />
      <circle cx={18} cy={30} r={3.2} fill={BG} />
      <circle cx={18} cy={30} r={3.2} />
      <circle cx={31.5} cy={30} r={3.2} fill={BG} />
      <circle cx={31.5} cy={30} r={3.2} />
      <path d="M24.5 11v26" stroke={ACCENT} strokeWidth={2.6} />
      <path d="M24.5 11v26" stroke={ACCENT} strokeWidth={8} opacity={0.16} />
    </Svg>
  );
}

/** How it works, step 3: a gauge whose needle stops at the bid limit, marked with a flag. */
function Limit({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M7 35a17 17 0 1 1 34 0Z" {...soft} />
      <path d="M7 35a17 17 0 1 1 34 0" />
      <path d="M11.5 35a12.5 12.5 0 0 1 12.5-12.5" strokeDasharray="1.5 4.3" opacity={0.65} />
      <path d="m24 35 8.4-9" strokeWidth={3} />
      <circle cx={24} cy={35} r={3.4} fill={BG} />
      <circle cx={24} cy={35} r={3.4} />
      <path d="M36 15.5V5.5l8 2.6-8 2.6" {...spark} />
      <path d="M36 15.5V4.5" stroke={ACCENT} />
      <path d="M5 41.5h38" opacity={0.5} />
    </Svg>
  );
}

export const FEATURE_ICONS = { 1: Estimate, 2: Market, 3: Risk, 4: WhatIf, 5: Compare, 6: Reminder, 7: Export, 8: Share, 9: Extension } as const;
export const STEP_ICONS = { 1: Paste, 2: Scan, 3: Limit } as const;

/**
 * The tile an icon sits on: a lit plate that tilts a little when its card is hovered, with the card's number
 * stamped beside it. The card must have the `group` class.
 */
export function IconPlate({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "text-primary relative isolate flex size-16 items-center justify-center rounded-[1.35rem] p-2 transition-transform duration-300 [--icon-accent:#e0a014] [--icon-bg:color-mix(in_oklab,var(--primary)_16%,var(--card))] group-hover:scale-105 group-hover:-rotate-3",
        "bg-[linear-gradient(145deg,color-mix(in_oklab,var(--primary)_26%,transparent),color-mix(in_oklab,var(--primary)_7%,transparent))]",
        "ring-1 ring-[color-mix(in_oklab,var(--primary)_32%,transparent)] ring-inset",
        "shadow-[0_10px_24px_-12px_color-mix(in_oklab,var(--primary)_75%,transparent),inset_0_1px_0_rgb(255_255_255/0.22)]",
        "after:absolute after:-inset-1 after:-z-10 after:rounded-[1.25rem] after:border after:border-dashed after:border-[color-mix(in_oklab,var(--primary)_28%,transparent)] after:opacity-0 after:transition-opacity group-hover:after:opacity-100",
        className,
      )}
    >
      {children}
    </span>
  );
}
