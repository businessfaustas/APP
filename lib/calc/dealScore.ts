import { PENALIZED_FLAG_CODES, VERDICT_WEIGHTS as W } from "@/lib/config/verdictWeights";

import { clamp } from "./money";
import type { VerdictSignals } from "./types";

export interface DealScoreArgs {
  maxBid: number | null;
  currentBid: number | null;
  headroomBps: number | null;
  signals: VerdictSignals;
  worstProfitAtMaxBid: number | null;
  expectedRoiAtMaxBidBps: number | null;
}

export function dealScore(a: DealScoreArgs): number {
  if (a.maxBid === null) return 0;
  const s = a.signals;
  let score = 100;
  score -= W.severityPerPoint * s.severity;
  if (s.frameSuspected) score -= W.frame;
  if (s.floodSuspected) score -= W.flood;
  if (s.airbagsDeployed) score -= W.airbags;
  if (s.overallConfidence < W.lowConfidenceThreshold) score -= W.lowConfidence;
  if (a.currentBid !== null && a.headroomBps !== null && a.headroomBps < W.lowHeadroomBps) score -= W.lowHeadroom;
  if (a.worstProfitAtMaxBid !== null && a.worstProfitAtMaxBid < 0) score -= W.worstCaseLoss;
  for (const f of s.flags) {
    if (PENALIZED_FLAG_CODES.has(f.code)) continue;
    if (f.level === "HIGH") score -= W.otherHighFlag;
    else if (f.level === "MEDIUM") score -= W.mediumFlag;
  }
  if (a.expectedRoiAtMaxBidBps !== null && a.expectedRoiAtMaxBidBps >= W.roiBonusBps) score += W.roiBonus;
  return Math.round(clamp(score, 0, 100));
}
