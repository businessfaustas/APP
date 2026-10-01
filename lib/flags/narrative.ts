/** Deterministic narrative used in demo mode, without AI, or when the AI text fails the guard. */
import { formatUsdPlain as usd } from "@/lib/calc/format";
import type { CalculationResult } from "@/lib/calc/types";
import type { RiskFlag } from "@/lib/domain/schemas";

const VERDICT_TEXT = { GO: "GO", BE_CAUTIOUS: "BE CAUTIOUS", WALK_AWAY: "WALK AWAY" } as const;

export function templateNarrative(args: { calc: CalculationResult; currentBid: number | null; flags: RiskFlag[]; checklist: string[] }): string {
  const { calc: c } = args;
  const e = c.scenarios.expected;
  const bullets: string[] = [];
  if (c.maxBid === null) {
    bullets.push(`Verdict: ${VERDICT_TEXT[c.verdict]} — no bid reaches your ${usd(c.targetProfit)} profit target.`);
  } else {
    bullets.push(
      `Verdict: ${VERDICT_TEXT[c.verdict]} — do not bid above ${usd(c.maxBid)}${args.currentBid !== null ? ` (current bid ${usd(args.currentBid)})` : ""}.`,
    );
    if (e.profitAtMaxBid !== null)
      bullets.push(
        `Expected profit at your max bid: ${usd(e.profitAtMaxBid)}${e.roiAtMaxBidBps !== null ? ` (ROI ${(e.roiAtMaxBidBps / 100).toFixed(1)}%)` : ""}; worst case ${usd(c.scenarios.worst.profitAtMaxBid ?? 0)}, best case ${usd(c.scenarios.best.profitAtMaxBid ?? 0)}.`,
      );
    if (c.comfortBid !== null) bullets.push(`Comfort bid ${usd(c.comfortBid)} — you break even even if the worst case happens.`);
  }
  bullets.push(
    `Biggest costs: repairs ${usd(e.repair)} (parts ${usd(e.repairBreakdown.parts)}, labor ${usd(e.repairBreakdown.labor)}), transport ${usd(e.logistics)}${c.feesAtMaxBid ? `, auction fees ${usd(c.feesAtMaxBid.total)}` : ""}.`,
  );
  const risks = args.flags.filter((f) => f.level === "HARD_STOP" || f.level === "HIGH" || f.level === "MEDIUM").slice(0, 3);
  if (risks.length) bullets.push(`Main risks: ${risks.map((r) => r.title.toLowerCase()).join("; ")}.`);
  if (args.checklist.length) bullets.push(`Before you bid: ${args.checklist.slice(0, 2).join(" ")}`);
  return bullets.map((b) => `• ${b}`).join("\n");
}
