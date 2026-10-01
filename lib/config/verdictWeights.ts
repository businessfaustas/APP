/**
 * Verdict and deal-score tuning. Pure data — safe in the browser.
 * Tune these from real outcomes in the deal journal.
 */
export const VERDICT_WEIGHTS = {
  // BE_CAUTIOUS triggers
  cautionSeverity: 8,
  cautionConfidence: 0.5,
  cautionHeadroomBps: 1500,
  /** worst-case loss at max bid larger than this share of worst-case total cost → caution */
  cautionWorstLossBps: 1000,
  cautionHighFlags: 2,

  // Deal score (start at 100)
  severityPerPoint: 3,
  frame: 20,
  flood: 25,
  airbags: 8,
  lowConfidence: 10,
  lowConfidenceThreshold: 0.6,
  lowHeadroom: 10,
  lowHeadroomBps: 1500,
  worstCaseLoss: 15,
  otherHighFlag: 5,
  mediumFlag: 2,
  roiBonus: 5,
  roiBonusBps: 2500,
} as const;

/** Flag codes whose effect is already counted by a dedicated deal-score penalty. */
export const PENALIZED_FLAG_CODES: ReadonlySet<string> = new Set([
  "FRAME_DAMAGE_SUSPECTED",
  "FLOOD_SUSPECTED",
  "AIRBAGS_DEPLOYED",
  "LOW_AI_CONFIDENCE",
]);
