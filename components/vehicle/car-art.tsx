"use client";

import { useId } from "react";

import type { DamageZone } from "@/lib/domain/schemas";
import { cn } from "@/lib/utils";

export type BodyType = "sedan" | "suv" | "pickup";
export type Tone = "go" | "caution" | "stop" | "neutral";

/** Picks a silhouette from what we know about the car. */
export function bodyTypeOf(v: { bodyClass?: string | null; make?: string | null; model?: string | null; vehicleClass?: string | null }): BodyType {
  const s = `${v.bodyClass ?? ""} ${v.make ?? ""} ${v.model ?? ""}`.toLowerCase();
  if (/pickup|truck|f-?150|f-?250|silverado|sierra|\bram\b|tacoma|tundra|ranger|frontier|colorado|titan|gladiator|cybertruck/.test(s)) return "pickup";
  if (
    /suv|sport utility|crossover|multipurpose|\bvan\b|wagon|rav4|cr-v|cx-5|x3|x5|q5|q7|explorer|tahoe|highlander|pilot|model y|outback|forester|wrangler|grand cherokee/.test(
      s,
    )
  )
    return "suv";
  if (v.vehicleClass === "truck_suv") return "suv";
  return "sedan";
}

const BODY: Record<BodyType, { body: string; windows: string[]; wheels: [number, number]; r: number; lines: string[]; head: string; tail: string }> = {
  sedan: {
    body: "M34 138 L30 120 Q30 106 46 103 L94 97 Q118 70 146 64 L236 61 Q258 62 276 78 L294 95 L348 102 Q370 106 373 120 L372 134 Q371 138 364 138 L346 138 A28 28 0 0 0 290 138 L128 138 A28 28 0 0 0 72 138 Z",
    windows: ["M106 96 Q125 75 148 70 L184 68 L184 96 Z", "M190 68 L234 67 Q252 68 266 82 L279 96 L190 96 Z"],
    wheels: [100, 318],
    r: 24,
    lines: ["M187 99 L187 132", "M262 99 Q266 116 263 132"],
    head: "M350 106 L369 110 L368 117 L349 113 Z",
    tail: "M31 110 L45 107 L45 116 L31 118 Z",
  },
  suv: {
    body: "M30 140 L28 104 Q28 88 44 84 L60 82 Q72 52 104 50 L262 48 Q280 49 294 64 L312 86 L352 92 Q372 96 374 112 L373 136 Q372 140 365 140 L348 140 A30 30 0 0 0 288 140 L130 140 A30 30 0 0 0 70 140 Z",
    windows: ["M70 82 Q80 60 106 58 L158 57 L158 84 Z", "M164 57 L222 56 L222 84 L164 84 Z", "M228 56 L262 56 Q276 57 288 70 L301 86 L228 86 Z"],
    wheels: [100, 318],
    r: 26,
    lines: ["M161 88 L161 134", "M225 88 L225 134"],
    head: "M352 96 L371 100 L370 108 L351 104 Z",
    tail: "M29 92 L40 90 L40 104 L29 105 Z",
  },
  pickup: {
    body: "M28 140 L28 102 Q28 96 34 96 L178 96 L178 66 Q180 54 194 52 L262 51 Q278 52 290 66 L308 88 L352 94 Q372 98 374 114 L373 136 Q372 140 365 140 L348 140 A30 30 0 0 0 288 140 L130 140 A30 30 0 0 0 70 140 Z",
    windows: ["M186 88 L186 64 Q188 59 196 59 L232 58 L232 88 Z", "M238 58 L260 58 Q272 59 282 70 L296 88 L238 88 Z"],
    wheels: [100, 318],
    r: 26,
    lines: ["M34 100 L176 100", "M235 92 L235 134"],
    head: "M352 98 L371 102 L370 110 L351 106 Z",
    tail: "M29 104 L38 104 L38 118 L29 118 Z",
  },
};

/** Where each damage zone sits on the side view (cx, cy, rx, ry). */
const ZONE_SPOT: Record<DamageZone, [number, number, number, number]> = {
  front: [356, 116, 24, 20],
  front_left: [326, 108, 28, 22],
  front_right: [326, 108, 28, 22],
  rear: [40, 116, 22, 20],
  rear_left: [72, 108, 28, 22],
  rear_right: [72, 108, 28, 22],
  left_side: [204, 112, 62, 24],
  right_side: [204, 112, 62, 24],
  roof: [190, 60, 50, 12],
  engine_bay: [318, 98, 26, 12],
  undercarriage: [204, 142, 96, 8],
  interior: [190, 84, 42, 14],
};

/** Body-specific positions where the generic one would miss the panel. */
const SPOT_OVERRIDE: Record<BodyType, Partial<Record<DamageZone, [number, number, number, number]>>> = {
  sedan: {},
  suv: { roof: [180, 50, 70, 10], interior: [190, 72, 50, 14] },
  pickup: { roof: [228, 54, 36, 10], interior: [232, 74, 30, 12], rear_left: [60, 112, 26, 16], rear_right: [60, 112, 26, 16] },
};

const TONE_GLOW: Record<Tone, string> = {
  go: "var(--go)",
  caution: "var(--caution)",
  stop: "var(--stop)",
  neutral: "var(--primary)",
};

export function CarArt({
  body = "sedan",
  zones = [],
  tone = "neutral",
  scanning = false,
  showDamage = true,
  className,
  label,
}: {
  body?: BodyType;
  zones?: { zone: DamageZone; severity: number }[];
  tone?: Tone;
  scanning?: boolean;
  showDamage?: boolean;
  className?: string;
  label?: string;
}) {
  const id = useId().replace(/:/g, "");
  const b = BODY[body];
  const hits = showDamage ? zones.filter((z) => z.severity > 0) : [];
  return (
    <svg viewBox="0 0 400 180" className={cn("h-auto w-full", className)} role="img" aria-label={label ?? "Vehicle"}>
      <defs>
        <linearGradient id={`${id}-paint`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e9ebf1" />
          <stop offset="0.45" stopColor="#b9bdca" />
          <stop offset="1" stopColor="#6c7284" />
        </linearGradient>
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2b3447" />
          <stop offset="0.55" stopColor="#151a26" />
          <stop offset="1" stopColor="#323c52" />
        </linearGradient>
        <radialGradient id={`${id}-rim`} cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#f2f3f7" />
          <stop offset="0.6" stopColor="#9aa0ae" />
          <stop offset="1" stopColor="#5d6372" />
        </radialGradient>
        <radialGradient id={`${id}-shadow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#000" stopOpacity="0.45" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-halo`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={TONE_GLOW[tone]} stopOpacity="0.26" />
          <stop offset="0.7" stopColor={TONE_GLOW[tone]} stopOpacity="0.06" />
          <stop offset="1" stopColor={TONE_GLOW[tone]} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-hit`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ff4d4d" stopOpacity="0.85" />
          <stop offset="0.55" stopColor="#ff4d4d" stopOpacity="0.35" />
          <stop offset="1" stopColor="#ff4d4d" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-scan`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={TONE_GLOW.neutral} stopOpacity="0" />
          <stop offset="0.5" stopColor={TONE_GLOW.neutral} stopOpacity="0.55" />
          <stop offset="1" stopColor={TONE_GLOW.neutral} stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <path d={b.body} />
        </clipPath>
      </defs>

      <ellipse cx="202" cy="150" rx="185" ry="26" fill={`url(#${id}-halo)`} />
      <ellipse cx="202" cy="160" rx="176" ry="11" fill={`url(#${id}-shadow)`} />

      <path d={b.body} fill={`url(#${id}-paint)`} stroke="#4b5060" strokeOpacity="0.55" strokeWidth="1.2" />
      {/* light catching the shoulder line */}
      <path d={b.body} fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="1" clipPath={`url(#${id}-clip)`} transform="translate(0 3)" />
      {b.windows.map((w) => (
        <path key={w} d={w} fill={`url(#${id}-glass)`} />
      ))}
      <path d="M150 64 L120 100" stroke="#fff" strokeOpacity="0.12" strokeWidth="10" clipPath={`url(#${id}-clip)`} />
      {b.lines.map((l) => (
        <path key={l} d={l} fill="none" stroke="#3a3f4d" strokeOpacity="0.45" strokeWidth="1.2" />
      ))}
      <path d={b.head} fill="#fff6d8" />
      <path d={b.tail} fill="#e5484d" />

      {b.wheels.map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="138" r={b.r} fill="#14161c" />
          <circle cx={cx} cy="138" r={b.r * 0.62} fill={`url(#${id}-rim)`} />
          <circle cx={cx} cy="138" r={b.r * 0.18} fill="#3c414e" />
        </g>
      ))}

      {hits.map((h) => {
        const [cx, cy, rx, ry] = SPOT_OVERRIDE[body][h.zone] ?? ZONE_SPOT[h.zone];
        const k = 0.75 + Math.min(10, h.severity) / 20;
        return (
          <g key={h.zone}>
            <ellipse className="glow-pulse" cx={cx} cy={cy} rx={rx * k} ry={ry * k} fill={`url(#${id}-hit)`} />
            <circle cx={cx} cy={cy} r="3.5" fill="#ff4d4d" stroke="#fff" strokeWidth="1.5" />
          </g>
        );
      })}

      {scanning && (
        <g clipPath={`url(#${id}-clip)`}>
          <rect className="scan" x="0" y="40" width="120" height="110" fill={`url(#${id}-scan)`} />
        </g>
      )}
    </svg>
  );
}

/**
 * The picture for a lot: its real photo when there is one, otherwise the illustration
 * with the damaged areas marked, lit like a studio shot.
 */
export function CarVisual({
  photo,
  body,
  zones,
  tone = "neutral",
  className,
  label,
  scanning,
}: {
  photo?: string | null;
  body?: BodyType;
  zones?: { zone: DamageZone; severity: number }[];
  tone?: Tone;
  className?: string;
  label?: string;
  scanning?: boolean;
}) {
  const real = photo && !photo.startsWith("/demo-photos/") ? photo : null;
  const line = "color-mix(in oklab, var(--foreground) 9%, transparent)";
  return (
    <div className={cn("bg-surface-2 relative isolate overflow-hidden", className)}>
      {real ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={real} alt={label ?? ""} className="absolute inset-0 size-full object-cover" loading="lazy" />
          {scanning && (
            <div className="scan absolute inset-0" aria-hidden="true">
              <div className="via-primary/40 h-full w-1/3 bg-gradient-to-r from-transparent to-transparent" />
            </div>
          )}
        </>
      ) : (
        <>
          <div
            className="absolute inset-0 -z-10"
            style={{ background: `radial-gradient(75% 65% at 50% 28%, color-mix(in oklab, ${TONE_GLOW[tone]} 24%, transparent), transparent 72%)` }}
            aria-hidden="true"
          />
          <div
            className="absolute inset-x-[-25%] bottom-0 -z-10 h-1/2 [mask-image:linear-gradient(to_top,black_20%,transparent)]"
            style={{
              backgroundImage: `linear-gradient(to right, ${line} 1px, transparent 1px), linear-gradient(to bottom, ${line} 1px, transparent 1px)`,
              backgroundSize: "28px 28px",
              transform: "perspective(260px) rotateX(58deg)",
              transformOrigin: "bottom",
            }}
            aria-hidden="true"
          />
          <div className="absolute inset-0 grid place-items-center px-[5%] pt-[2%]">
            <CarArt body={body} zones={zones} tone={tone} label={label} scanning={scanning} />
          </div>
        </>
      )}
    </div>
  );
}
