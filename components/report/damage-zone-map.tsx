"use client";

import type { DamageAssessment, DamageZone, RepairLineItem } from "@/lib/domain/schemas";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

type Shape = { zone: DamageZone; d: string; lx: number; ly: number };

// Top-down car, nose up. LH (driver side) is on the left.
const SHAPES: Shape[] = [
  { zone: "interior", d: "M52 118 H148 V244 H52 Z", lx: 100, ly: 128 },
  { zone: "roof", d: "M70 148 H130 V214 H70 Z", lx: 100, ly: 184 },
  { zone: "front", d: "M50 14 Q100 2 150 14 L156 46 H44 Z", lx: 100, ly: 32 },
  { zone: "engine_bay", d: "M58 50 H142 V112 H58 Z", lx: 100, ly: 84 },
  { zone: "front_left", d: "M24 46 H54 V112 H20 Q18 76 24 46 Z", lx: 37, ly: 82 },
  { zone: "front_right", d: "M146 46 H176 Q182 76 180 112 H146 Z", lx: 163, ly: 82 },
  { zone: "left_side", d: "M18 116 H48 V246 H18 Z", lx: 33, ly: 182 },
  { zone: "right_side", d: "M152 116 H182 V246 H152 Z", lx: 167, ly: 182 },
  { zone: "rear_left", d: "M20 250 H54 V314 H26 Q20 284 20 250 Z", lx: 37, ly: 282 },
  { zone: "rear_right", d: "M146 250 H180 Q180 284 174 314 H146 Z", lx: 163, ly: 282 },
  { zone: "rear", d: "M44 318 H156 L150 346 Q100 358 50 346 Z", lx: 100, ly: 334 },
];

export function zoneSeverities(damage: DamageAssessment | null, lines: RepairLineItem[]): Partial<Record<DamageZone, number>> {
  const out: Partial<Record<DamageZone, number>> = {};
  for (const z of damage?.impact_zones ?? []) out[z.zone] = Math.max(out[z.zone] ?? 0, z.severity);
  for (const l of lines) {
    if (l.origin === "VISIBLE" && l.included) out[l.zone] = Math.max(out[l.zone] ?? 0, 3);
  }
  return out;
}

function fillClass(sev: number | undefined): string {
  if (!sev) return "fill-muted";
  if (sev <= 3) return "fill-caution/35";
  if (sev <= 6) return "fill-caution/80";
  return "fill-stop/80";
}

export function DamageZoneMap({
  severities,
  selected,
  onSelect,
}: {
  severities: Partial<Record<DamageZone, number>>;
  selected: DamageZone | null;
  onSelect: (z: DamageZone | null) => void;
}) {
  const t = useT();
  const under = severities.undercarriage;
  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox="0 0 200 360" className="h-auto w-full max-w-[220px]" role="group" aria-label={t("report.damageMapAria")}>
        <path d="M44 14 Q100 -4 156 14 L184 120 V250 L176 318 Q100 368 24 318 L16 250 V120 Z" className="stroke-border fill-none" strokeWidth={2} />
        {SHAPES.map((s) => {
          const sev = severities[s.zone];
          const isSel = selected === s.zone;
          return (
            <g key={s.zone}>
              <path
                d={s.d}
                role="button"
                tabIndex={0}
                aria-pressed={isSel}
                aria-label={`${t(`report.zone.${s.zone}`)}: ${sev ? t("report.zoneSeverity", { n: sev }) : t("report.noDamageFound")}`}
                className={cn(
                  "stroke-card focus-visible:stroke-ring cursor-pointer transition-opacity outline-none hover:opacity-80",
                  fillClass(sev),
                  isSel && "stroke-foreground",
                )}
                strokeWidth={isSel ? 2.5 : 2}
                onClick={() => onSelect(isSel ? null : s.zone)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(isSel ? null : s.zone);
                  }
                }}
              >
                <title>{`${t(`report.zone.${s.zone}`)}${sev ? t("report.zoneSeverityShort", { n: sev }) : ""}`}</title>
              </path>
              {sev ? (
                <text
                  x={s.lx}
                  y={s.ly}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-foreground pointer-events-none text-[11px] font-semibold"
                >
                  {sev}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <button
        type="button"
        onClick={() => onSelect(selected === "undercarriage" ? null : "undercarriage")}
        className={cn(
          "rounded-full border px-3 py-1 text-xs",
          under ? (under > 6 ? "border-stop/50 bg-stop-soft" : "border-caution/50 bg-caution-soft") : "text-muted-foreground",
          selected === "undercarriage" && "ring-foreground ring-2",
        )}
      >
        {t("report.zone.undercarriage")}
        {under ? ` · ${under}/10` : ""}
      </button>
      <div className="text-muted-foreground flex flex-wrap justify-center gap-3 text-[11px]">
        <span className="flex items-center gap-1">
          <span className="bg-muted size-2.5 rounded-sm" /> {t("report.sevNone")}
        </span>
        <span className="flex items-center gap-1">
          <span className="bg-caution/35 size-2.5 rounded-sm" /> {t("report.sevMinor")}
        </span>
        <span className="flex items-center gap-1">
          <span className="bg-caution/80 size-2.5 rounded-sm" /> {t("report.sevModerate")}
        </span>
        <span className="flex items-center gap-1">
          <span className="bg-stop/80 size-2.5 rounded-sm" /> {t("report.sevSevere")}
        </span>
      </div>
    </div>
  );
}
