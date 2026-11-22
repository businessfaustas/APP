import { describe, expect, it } from "vitest";

import { checkNarrative } from "@/lib/ai/narrativeGuard";
import { heuristicExtract } from "@/lib/providers/listing/heuristicExtract";
import { finalizeListing } from "@/lib/providers/listing/normalize";

import { CASES, THRESHOLDS, type Expected } from "./cases";

/**
 * `pnpm eval` runs the offline reader (always) and, when ANTHROPIC_API_KEY is set and
 * EVAL_LIVE=1, the real model too. The offline run needs no key, so it also runs in CI.
 */
const FIELDS: (keyof Expected)[] = ["vin", "year", "make", "model", "odometer", "titleCategory", "primaryDamage", "currentBid"];
const live = process.env.EVAL_LIVE === "1" && Boolean(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY);

type Reader = (text: string) => Promise<Partial<Record<keyof Expected, unknown>>>;

const offline: Reader = async (text) => {
  const l = finalizeListing({ ...heuristicExtract(text), source: "COPART" }, "PARSER");
  return {
    vin: l.vin,
    year: l.year,
    make: l.make,
    model: l.model,
    odometer: l.odometer,
    titleCategory: l.titleCategory,
    primaryDamage: l.primaryDamage,
    currentBid: l.currentBid,
  };
};

const online: Reader = async (text) => {
  const { llmExtractListing } = await import("@/lib/ai/prompts/extractListing");
  const l = finalizeListing({ ...(await llmExtractListing(text, null)), source: "COPART" }, "LLM");
  return {
    vin: l.vin,
    year: l.year,
    make: l.make,
    model: l.model,
    odometer: l.odometer,
    titleCategory: l.titleCategory,
    primaryDamage: l.primaryDamage,
    currentBid: l.currentBid,
  };
};

const same = (a: unknown, b: unknown) => (typeof a === "string" && typeof b === "string" ? a.toUpperCase() === b.toUpperCase() : a === b);

async function score(reader: Reader, only: "clean" | "injection") {
  let right = 0;
  let total = 0;
  const misses: string[] = [];
  for (const c of CASES.filter((x) => Boolean(x.injection) === (only === "injection"))) {
    const got = await reader(c.text);
    for (const f of FIELDS) {
      if (c.expected[f] === undefined) continue;
      total++;
      if (same(got[f], c.expected[f])) right++;
      else misses.push(`${c.id}.${f}: expected ${String(c.expected[f])}, got ${String(got[f])}`);
    }
  }
  return { accuracy: total ? right / total : 1, misses };
}

describe("listing reader, offline", () => {
  it("reads the fields of real-looking listings", async () => {
    const r = await score(offline, "clean");
    expect(r.misses, r.misses.join("\n")).toEqual([]);
    expect(r.accuracy).toBeGreaterThanOrEqual(THRESHOLDS.offlineFieldAccuracy);
  });

  it("is not moved by hostile text appended to or hidden in a listing", async () => {
    const r = await score(offline, "injection");
    expect(r.misses, r.misses.join("\n")).toEqual([]);
    expect(r.accuracy).toBeGreaterThanOrEqual(THRESHOLDS.injectionFieldAccuracy);
  });
});

describe.skipIf(!live)("listing reader, live model", () => {
  it("reads the fields of real-looking listings", { timeout: 120_000 }, async () => {
    const r = await score(online, "clean");
    expect(r.accuracy, r.misses.join("\n")).toBeGreaterThanOrEqual(THRESHOLDS.liveFieldAccuracy);
  });

  it("ignores instructions hidden in the listing", { timeout: 180_000 }, async () => {
    const r = await score(online, "injection");
    expect(r.accuracy, r.misses.join("\n")).toBeGreaterThanOrEqual(THRESHOLDS.liveFieldAccuracy);
  });
});

describe("narrative guard", () => {
  it("accepts a narrative built from the computed numbers and rejects invented ones", () => {
    const facts = { maxBid: 3100, comfortBid: 2375, repair: 4865, scorePct: 73 };
    expect(checkNarrative("Repairs run about $4,865, so bid no more than $3,100.", facts).ok).toBe(true);
    expect(checkNarrative("This is a steal at $99,999.", facts).ok).toBe(false);
  });
});
