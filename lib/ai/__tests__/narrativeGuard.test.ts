import { describe, expect, it } from "vitest";

import { checkNarrative } from "../narrativeGuard";

const facts = { maxBid: 3100, profit: 2518, roiBps: 2551, headroomBps: 3226, worst: -791, confidence: 0.72, severity: 5 };

describe("narrative guard", () => {
  it("accepts numbers that exist in the facts", () => {
    const r = checkNarrative("Do not bid above $3,100. Expected profit $2,518 (25.5% ROI). Worst case −$791. 32% headroom. Confidence 72%.", facts);
    expect(r.ok).toBe(true);
  });
  it("allows ±$1 rounding", () => {
    expect(checkNarrative("Profit about $2,519.", facts).ok).toBe(true);
  });
  it("rejects invented numbers", () => {
    const r = checkNarrative("You could sell it for $25,000 and make 40% ROI.", facts);
    expect(r.ok).toBe(false);
    expect(r.offending).toEqual(["$25,000", "40%"]);
  });
  it("handles k shorthand near a real number", () => {
    expect(checkNarrative("Max bid around $3.1k.", facts).ok).toBe(true);
  });
});
