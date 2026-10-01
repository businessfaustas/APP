import { VERDICT_WEIGHTS as W } from "@/lib/config/verdictWeights";

import { formatUsdPlain } from "./format";
import type { VerdictSignals, VerdictValue } from "./types";

export interface VerdictArgs {
  maxBid: number | null;
  currentBid: number | null;
  headroomBps: number | null;
  signals: VerdictSignals;
  worstProfitAtMaxBid: number | null;
  worstTotalCostAtMaxBid: number | null;
  expectedProfitAtMaxBid: number | null;
  expectedRoiAtMaxBidBps: number | null;
}

export function worstCaseLossTooLarge(worstProfit: number | null, worstTotal: number | null): boolean {
  if (worstProfit === null || worstTotal === null) return false;
  // profit < −(cautionWorstLossBps / 10000) × total, in exact integer math
  return worstProfit * 10000 < -W.cautionWorstLossBps * worstTotal;
}

export function decideVerdict(a: VerdictArgs): { verdict: VerdictValue; reasons: string[] } {
  const { signals } = a;
  const hardStops = signals.flags.filter((f) => f.level === "HARD_STOP");
  const walk: string[] = [];
  for (const f of hardStops) walk.push(f.title ?? f.code);
  if (a.maxBid === null) walk.push("No bid reaches your profit target — the costs exceed the resale value.");
  else if (a.currentBid !== null && a.currentBid > a.maxBid)
    walk.push(`Current bid (${formatUsdPlain(a.currentBid)}) is already above your max bid (${formatUsdPlain(a.maxBid)}).`);
  if (walk.length > 0) return { verdict: "WALK_AWAY", reasons: walk };

  const caution: string[] = [];
  if (signals.severity >= W.cautionSeverity) caution.push(`High damage severity (${signals.severity}/10).`);
  if (signals.frameSuspected) caution.push("Frame / structural damage suspected.");
  if (signals.floodSuspected) caution.push("Flood or water damage suspected.");
  if (signals.overallConfidence < W.cautionConfidence)
    caution.push(`Low AI confidence (${Math.round(signals.overallConfidence * 100)}%) — photos are inconclusive.`);
  if (a.currentBid !== null && a.headroomBps !== null && a.headroomBps < W.cautionHeadroomBps)
    caution.push(`Only ${(a.headroomBps / 100).toFixed(0)}% headroom between the current bid and your max bid.`);
  if (worstCaseLossTooLarge(a.worstProfitAtMaxBid, a.worstTotalCostAtMaxBid))
    caution.push(`Worst case loses ${formatUsdPlain(Math.abs(a.worstProfitAtMaxBid ?? 0))} at your max bid.`);
  const highFlags = signals.flags.filter((f) => f.level === "HIGH");
  if (highFlags.length >= W.cautionHighFlags) caution.push(`${highFlags.length} high-risk flags.`);
  if (caution.length > 0) return { verdict: "BE_CAUTIOUS", reasons: caution };

  const go: string[] = [];
  if (a.expectedProfitAtMaxBid !== null)
    go.push(
      `Expected profit ${formatUsdPlain(a.expectedProfitAtMaxBid)}${
        a.expectedRoiAtMaxBidBps !== null ? ` (ROI ${(a.expectedRoiAtMaxBidBps / 100).toFixed(1)}%)` : ""
      } even at your max bid.`,
    );
  if (a.currentBid !== null && a.headroomBps !== null) go.push(`${(a.headroomBps / 100).toFixed(0)}% headroom between the current bid and your max bid.`);
  if (highFlags.length === 0) go.push("No structural, flood or title red flags detected.");
  return { verdict: "GO", reasons: go };
}
