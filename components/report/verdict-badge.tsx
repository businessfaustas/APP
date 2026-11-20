"use client";

import { RaceFlagIcon } from "@/components/icons";
import type { VerdictValue } from "@/lib/calc/types";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

/** GO is the green flag, BE CAUTIOUS the yellow one and WALK AWAY the red one. */
const META: Record<VerdictValue, string> = {
  GO: "text-go [--slant-bg:var(--go-soft)] [--slant-line:color-mix(in_oklab,var(--go)_45%,transparent)]",
  BE_CAUTIOUS: "text-caution [--slant-bg:var(--caution-soft)] [--slant-line:color-mix(in_oklab,var(--caution)_45%,transparent)]",
  WALK_AWAY: "text-stop [--slant-bg:var(--stop-soft)] [--slant-line:color-mix(in_oklab,var(--stop)_45%,transparent)]",
};

export function VerdictBadge({ verdict, size = "sm", className }: { verdict: VerdictValue; size?: "sm" | "lg"; className?: string }) {
  const t = useT();
  return (
    <span
      data-testid="verdict-badge"
      data-verdict={verdict}
      className={cn(
        "slant font-display inline-flex items-center gap-1.5 font-bold tracking-[0.07em] whitespace-nowrap uppercase italic",
        size === "lg" ? "px-5 py-2 text-xl [--slant-skew:-12deg]" : "px-3 py-[3px] text-[0.85rem] [--slant-skew:-14deg]",
        META[verdict],
        className,
      )}
    >
      <RaceFlagIcon className={size === "lg" ? "size-5" : "size-3.5"} />
      {t(`domain.verdict.${verdict}`)}
    </span>
  );
}
