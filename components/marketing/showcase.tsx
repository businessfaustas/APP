"use client";

import { ScanLineIcon } from "lucide-react";

import { ScoreRing } from "@/components/report/deal-card";
import { VerdictBadge } from "@/components/report/verdict-badge";
import { CarArt, type BodyType } from "@/components/vehicle/car-art";
import type { VerdictValue } from "@/lib/calc/types";
import type { DamageZone } from "@/lib/domain/schemas";
import { useT } from "@/lib/i18n/client";
import { cn, formatUsd } from "@/lib/utils";

export interface ShowcaseData {
  title: string;
  source: string;
  verdict: VerdictValue;
  maxBid: number | null;
  score: number;
  repair: number;
  zones: { zone: DamageZone; severity: number }[];
  paint: string;
  body: BodyType;
}

const TONE = { GO: "go", BE_CAUTIOUS: "caution", WALK_AWAY: "stop" } as const;

/**
 * The product in one picture: a lot being scanned, with the three things a report gives you
 * floating around it. Always rendered as a dark studio shot, in either theme.
 * Numbers come from the real calculation of the demo lot, so they match the sample report.
 */
export function Showcase({ data, className }: { data: ShowcaseData; className?: string }) {
  const t = useT();
  const top = [...data.zones].sort((a, b) => b.severity - a.severity).slice(0, 3);
  return (
    <div
      className={cn(
        "dark text-foreground top-line relative isolate aspect-[4/3] w-full overflow-hidden rounded-3xl border border-white/10 bg-[#0a0c14] shadow-2xl sm:aspect-[5/4]",
        className,
      )}
    >
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(70% 55% at 50% 38%, color-mix(in oklab, var(--primary) 30%, transparent), transparent 70%), radial-gradient(60% 40% at 80% 100%, color-mix(in oklab, var(--go) 14%, transparent), transparent 70%)",
        }}
        aria-hidden="true"
      />
      <div
        className="grid-lines absolute inset-x-[-30%] bottom-0 -z-10 h-[46%] [mask-image:linear-gradient(to_top,black_10%,transparent)]"
        style={{ transform: "perspective(320px) rotateX(60deg)", transformOrigin: "bottom" }}
        aria-hidden="true"
      />

      <div className="rise absolute top-4 left-4 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium backdrop-blur sm:top-5 sm:left-5">
        <span className="relative flex size-2">
          <span className="bg-go absolute inline-flex size-full animate-ping rounded-full opacity-60" />
          <span className="bg-go relative inline-flex size-2 rounded-full" />
        </span>
        <span className="truncate">{data.title}</span>
        <span className="text-muted-foreground hidden sm:inline">· {data.source}</span>
      </div>
      <div
        className="rise text-muted-foreground absolute top-4 right-4 hidden items-center gap-1.5 text-xs sm:top-5 sm:right-5 sm:flex"
        style={{ ["--i" as string]: 1 }}
      >
        <ScanLineIcon className="text-primary size-3.5" aria-hidden="true" /> {t("landing.showScanning")}
      </div>

      <div className="absolute inset-x-[7%] top-[20%] sm:top-[17%]">
        <CarArt body={data.body} zones={data.zones} tone={TONE[data.verdict]} paint={data.paint} seed={data.title} scanning label={data.title} />
      </div>

      <div className="rise absolute bottom-4 left-4 sm:bottom-5 sm:left-5" style={{ ["--i" as string]: 3 }}>
        <div className="float rounded-2xl border border-white/10 bg-[#11131d]/85 p-3.5 shadow-xl backdrop-blur sm:p-4">
          <VerdictBadge verdict={data.verdict} />
          <div className="eyebrow mt-2.5 max-w-[8.5rem] leading-snug">{t("report.doNotBidAbove")}</div>
          <div className="display text-3xl sm:text-4xl">{data.maxBid !== null ? formatUsd(data.maxBid) : "—"}</div>
        </div>
      </div>

      <div className="rise absolute right-4 bottom-4 flex items-end gap-3 sm:right-5 sm:bottom-5" style={{ ["--i" as string]: 5 }}>
        {top.length > 0 && (
          <div
            className="float hidden w-40 rounded-2xl border border-white/10 bg-[#11131d]/85 p-3.5 shadow-xl backdrop-blur md:block"
            style={{ animationDelay: "0.9s" }}
          >
            <div className="eyebrow">{t("report.damageCard")}</div>
            <ul className="mt-2 space-y-2">
              {top.map((z) => (
                <li key={z.zone} className="space-y-1">
                  <div className="flex justify-between gap-2 text-xs">
                    <span className="truncate">{t(`report.zone.${z.zone}`)}</span>
                    <span className="num text-muted-foreground">{z.severity}/10</span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="grow-x h-full rounded-full"
                      style={{ width: `${z.severity * 10}%`, background: z.severity > 6 ? "var(--status-critical)" : "var(--status-warning)" }}
                    />
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-baseline justify-between border-t border-white/10 pt-2.5 text-xs">
              <span className="text-muted-foreground">{t("report.repairEstimate")}</span>
              <span className="num font-semibold">{formatUsd(data.repair)}</span>
            </div>
          </div>
        )}
        <div className="float rounded-2xl border border-white/10 bg-[#11131d]/85 p-3 shadow-xl backdrop-blur" style={{ animationDelay: "1.7s" }}>
          <ScoreRing score={data.score} size={68} />
        </div>
      </div>
    </div>
  );
}
