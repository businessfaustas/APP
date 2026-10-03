"use client";

import { CheckCircle2Icon, OctagonXIcon, TriangleAlertIcon } from "lucide-react";

import type { VerdictValue } from "@/lib/calc/types";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

const META: Record<VerdictValue, { className: string; Icon: typeof CheckCircle2Icon }> = {
  GO: { className: "bg-go-soft text-go ring-go/30", Icon: CheckCircle2Icon },
  BE_CAUTIOUS: { className: "bg-caution-soft text-caution ring-caution/30", Icon: TriangleAlertIcon },
  WALK_AWAY: { className: "bg-stop-soft text-stop ring-stop/30", Icon: OctagonXIcon },
};

export function VerdictBadge({ verdict, size = "sm", className }: { verdict: VerdictValue; size?: "sm" | "lg"; className?: string }) {
  const t = useT();
  const m = META[verdict];
  return (
    <span
      data-testid="verdict-badge"
      data-verdict={verdict}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold tracking-wide ring-1 ring-inset",
        size === "lg" ? "px-4 py-2 text-lg" : "px-2.5 py-0.5 text-xs",
        m.className,
        className,
      )}
    >
      <m.Icon className={size === "lg" ? "size-5" : "size-3.5"} aria-hidden="true" />
      {t(`domain.verdict.${verdict}`)}
    </span>
  );
}
