"use client";

import { lineCost, lineIncludedInScenario } from "@/lib/calc/repair";
import type { RepairLineItem } from "@/lib/domain/schemas";
import { useT } from "@/lib/i18n/client";
import { cn, formatUsd } from "@/lib/utils";

import { useReport } from "./report-context";

/**
 * A repair line's estimated cost: the expected-case figure, or the worst-case one (marked as such)
 * for a hidden-damage suspicion that only counts there. Follows the What-if sliders.
 */
export function LineCost({ line, className }: { line: RepairLineItem; className?: string }) {
  const { assumptions } = useReport();
  const t = useT();
  const rates = {
    partsSourcePreference: assumptions.partsSourcePreference,
    partsDiscountBps: assumptions.partsDiscountBps,
    laborRate: assumptions.laborRate,
    paintMaterialsPerHour: assumptions.paintMaterialsPerHour,
  };
  if (line.included && lineIncludedInScenario(line, "expected")) {
    return (
      <span className={cn("num font-semibold", className)} title={t("report.costTitle")}>
        {formatUsd(lineCost(line, "expected", rates))}
      </span>
    );
  }
  if (line.included && lineIncludedInScenario(line, "worst")) {
    return (
      <span className={cn("num text-muted-foreground", className)} title={t("report.costTitle")}>
        {t("report.worstCost", { amount: formatUsd(lineCost(line, "worst", rates)) })}
      </span>
    );
  }
  return <span className={cn("text-muted-foreground", className)}>—</span>;
}
