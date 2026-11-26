import { describe, expect, it } from "vitest";

import { findDemoFixtureById } from "@/lib/demo/fixtures";
import type { RepairLineItem } from "@/lib/domain/schemas";

import {
  assumptionsFromSettings,
  DEFAULT_SETTINGS,
  FRAME_FLAG_CODE,
  frameStillSuspected,
  isFrameRuleLine,
  runAnalysisCalc,
  visibleFlags,
  type AnalysisBase,
} from "../build";
import { placeholderFeeSchedule } from "../placeholderFees";

const audi = findDemoFixtureById("audi-a3")!;

const frameLine: RepairLineItem = {
  ...audi.repair.lineItems[0]!,
  id: "frame",
  partKey: "sublet_frame_measure",
  partName: "Frame measuring & pull",
  kind: "SUBLET",
  action: "REPAIR",
  origin: "RULE",
  probability: 1,
  prices: { OEM_NEW: null, AFTERMARKET: { low: 600, mid: 800, high: 1000 }, USED: null },
  bodyHours: { low: 0, mid: 0, high: 0 },
  paintHours: { low: 0, mid: 0, high: 0 },
  mechHours: { low: 0, mid: 0, high: 0 },
};

function base(frame: boolean): AnalysisBase {
  return {
    lineItems: [...audi.repair.lineItems, ...(frame ? [frameLine] : [])],
    baseContingencyBps: audi.repair.baseContingencyBps,
    mvClean: audi.market.mvClean,
    destinationResale: null,
    distanceMiles: audi.distanceMiles,
    milesToPort: null,
    currentBid: null,
    feeSchedules: {
      LICENSED_DEALER: placeholderFeeSchedule("COPART", "LICENSED_DEALER"),
      PUBLIC_VIA_BROKER: placeholderFeeSchedule("COPART", "PUBLIC_VIA_BROKER"),
    },
    exportProfile: null,
    signals: {
      severity: 5,
      frameSuspected: frame,
      floodSuspected: false,
      airbagsDeployed: false,
      overallConfidence: 0.8,
      flags: frame ? [{ code: FRAME_FLAG_CODE, level: "HIGH", title: "Frame / structural damage suspected" }] : [],
    },
    extraFixedCosts: [],
  };
}

describe("the buyer dismissing a suspected frame damage", () => {
  const a = assumptionsFromSettings(DEFAULT_SETTINGS);

  it("is off by default, so nothing changes for anyone who never touches it", () => {
    expect(a.frameDismissed).toBe(false);
    expect(runAnalysisCalc(base(false), a).maxBid).toBe(3100); // the reference case, unchanged
  });

  it("drops the caution, the score penalty and the frame-pull cost", () => {
    const suspected = runAnalysisCalc(base(true), a);
    expect(suspected.verdict).toBe("BE_CAUTIOUS");
    expect(suspected.verdictReasons.join(" ")).toMatch(/frame/i);

    // as the report does it: the toggle flips the assumption and takes the frame-pull line out of the repair lines
    const b = base(true);
    const dismissed = runAnalysisCalc(
      { ...b, lineItems: b.lineItems.map((l) => (isFrameRuleLine(l) ? { ...l, included: false } : l)) },
      { ...a, frameDismissed: true },
    );
    expect(dismissed.verdict).not.toBe("BE_CAUTIOUS");
    expect(dismissed.verdictReasons.join(" ")).not.toMatch(/frame/i);
    expect(dismissed.dealScore).toBeGreaterThan(suspected.dealScore);
    expect(dismissed.maxBid!).toBeGreaterThan(suspected.maxBid!); // the frame-pull line no longer costs anything
  });

  it("matches a report where the AI never suspected frame damage", () => {
    const b = base(true);
    const dismissed = runAnalysisCalc(
      { ...b, lineItems: b.lineItems.map((l) => (isFrameRuleLine(l) ? { ...l, included: false } : l)) },
      { ...a, frameDismissed: true },
    );
    const never = runAnalysisCalc(base(false), a);
    expect(dismissed.maxBid).toBe(never.maxBid);
    expect(dismissed.dealScore).toBe(never.dealScore);
    expect(dismissed.verdict).toBe(never.verdict);
  });

  it("only removes the line that exists because of the suspicion, not a frame item the AI actually saw", () => {
    expect(isFrameRuleLine(frameLine)).toBe(true);
    expect(isFrameRuleLine({ ...frameLine, origin: "VISIBLE" })).toBe(false);
    expect(isFrameRuleLine({ ...frameLine, partKey: "front_rail" })).toBe(false);
  });

  it("hides only the frame warning from the risk list", () => {
    const flags = [
      { code: FRAME_FLAG_CODE, level: "HIGH" as const },
      { code: "LOW_PHOTO_COVERAGE", level: "MEDIUM" as const },
    ];
    expect(visibleFlags(flags, { frameDismissed: false })).toHaveLength(2);
    expect(visibleFlags(flags, { frameDismissed: true }).map((f) => f.code)).toEqual(["LOW_PHOTO_COVERAGE"]);
    expect(frameStillSuspected({ frameSuspected: true }, { frameDismissed: true })).toBe(false);
    expect(frameStillSuspected({ frameSuspected: true }, { frameDismissed: false })).toBe(true);
  });
});
