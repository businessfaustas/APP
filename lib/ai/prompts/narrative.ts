import "server-only";

import type { CalculationResult } from "@/lib/calc/types";
import type { RiskFlag } from "@/lib/domain/schemas";
import { templateNarrative } from "@/lib/flags/narrative";

import { generatePlainText } from "../client";
import { checkNarrative } from "../narrativeGuard";

const INSTRUCTIONS = `You write the summary of a salvage-car deal report for a car flipper.
Write 5–8 short bullet points (start each with "• "), plain English, no hype.
Cover: the verdict and max bid, expected profit and the range, the biggest cost drivers, the top risks,
and what to inspect or ask the yard before bidding.
Use ONLY numbers that appear in the provided JSON. Do not compute or invent new numbers.
Format money like $3,100.`;

export async function writeNarrative(args: {
  calc: CalculationResult;
  currentBid: number | null;
  flags: RiskFlag[];
  checklist: string[];
  vehicle: string;
  analysisId: string;
}): Promise<{ text: string; source: "AI" | "TEMPLATE" }> {
  const facts = {
    vehicle: args.vehicle,
    currentBid: args.currentBid,
    verdict: args.calc.verdict,
    verdictReasons: args.calc.verdictReasons,
    maxBid: args.calc.maxBid,
    comfortBid: args.calc.comfortBid,
    breakEvenBid: args.calc.breakEvenBid,
    targetProfit: args.calc.targetProfit,
    dealScore: args.calc.dealScore,
    headroomPercent: args.calc.headroomBps !== null ? Math.round(args.calc.headroomBps) / 100 : null,
    expected: args.calc.scenarios.expected,
    best: { resale: args.calc.scenarios.best.resale, profitAtMaxBid: args.calc.scenarios.best.profitAtMaxBid },
    worst: { resale: args.calc.scenarios.worst.resale, profitAtMaxBid: args.calc.scenarios.worst.profitAtMaxBid },
    expectedRoiPercent: args.calc.scenarios.expected.roiAtMaxBidBps !== null ? Math.round(args.calc.scenarios.expected.roiAtMaxBidBps) / 100 : null,
    feesAtMaxBid: args.calc.feesAtMaxBid,
    risks: args.flags.filter((f) => f.level !== "INFO").map((f) => ({ level: f.level, title: f.title })),
    beforeYouBid: args.checklist.slice(0, 5),
  };
  const fallback = () => ({ text: templateNarrative(args), source: "TEMPLATE" as const });
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const text = await generatePlainText({
        purpose: "NARRATIVE",
        kind: "text",
        instructions: INSTRUCTIONS,
        prompt: JSON.stringify(facts),
        analysisId: args.analysisId,
      });
      const guard = checkNarrative(text, facts);
      if (guard.ok && text.trim().length > 40) return { text: text.trim(), source: "AI" };
      console.warn("Narrative failed the number guard", guard.offending);
    } catch (err) {
      console.error("Narrative generation failed", err);
      return fallback();
    }
  }
  return fallback();
}
