import { describe, expect, it } from "vitest";

import { placeholderFeeSchedule } from "@/lib/calc/placeholderFees";
import { findDemoFixtureById } from "@/lib/demo/fixtures";

import { buildChecklist } from "../checklist";
import { templateNarrative } from "../narrative";
import { deriveFlags, type FlagInputs } from "../riskFlags";
import { assumptionsFromSettings, DEFAULT_SETTINGS, runAnalysisCalc } from "@/lib/calc/build";
import { assemble } from "@/lib/pipeline/assemble";

const NOW = new Date("2026-10-01T00:00:00Z");
const audi = findDemoFixtureById("audi-a3")!;

function inputs(over: Partial<FlagInputs> = {}): FlagInputs {
  return {
    listing: audi.listing(NOW),
    vehicle: audi.vehicle,
    history: audi.history,
    damage: audi.damage,
    damageFromPhotos: true,
    repair: audi.repair,
    market: audi.market,
    logistics: { distanceMiles: 240, method: "FIXTURE", yardZip: "75236", userZip: "77002", milesToPort: null },
    feeSchedule: placeholderFeeSchedule(),
    now: NOW,
    ...over,
  };
}

const codes = (i: FlagInputs) => deriveFlags(i).map((f) => f.code);

describe("risk flags", () => {
  it("odometer, keys, start, sale status", () => {
    const l = {
      ...audi.listing(NOW),
      odometerBrand: "NOT_ACTUAL" as const,
      hasKeys: false,
      runCondition: "WONT_START" as const,
      saleStatus: "ON_APPROVAL" as const,
    };
    expect(codes(inputs({ listing: l }))).toEqual(expect.arrayContaining(["ODOMETER_NOT_ACTUAL", "KEYS_MISSING", "DOES_NOT_START", "SALE_ON_APPROVAL"]));
  });

  it("VIN mismatch only for NHTSA decodes", () => {
    const v = { ...audi.vehicle, make: "BMW", decodeSource: "NHTSA vPIC" };
    expect(codes(inputs({ vehicle: v }))).toContain("VIN_MISMATCH");
    expect(codes(inputs({ vehicle: { ...v, decodeSource: "Listing" } }))).not.toContain("VIN_MISMATCH");
  });

  it("history problems", () => {
    const h = {
      ...audi.history,
      totalLossEvents: 2,
      theftRecords: 1,
      odometerRecords: [
        { date: "2020-01-01", reading: 50000 },
        { date: "2022-01-01", reading: 30000 },
      ],
    };
    expect(codes(inputs({ history: h }))).toEqual(expect.arrayContaining(["PRIOR_SALVAGE_EVENTS", "THEFT_RECORD", "ODOMETER_INCONSISTENT"]));
    expect(codes(inputs({ history: null }))).toContain("HISTORY_UNAVAILABLE");
  });

  it("market and logistics advisories", () => {
    expect(codes(inputs({ market: { ...audi.market, provider: "NONE" } }))).toContain("MARKET_VALUE_MISSING");
    expect(codes(inputs({ market: { ...audi.market, provider: "AI estimate — verify" } }))).toContain("MARKET_ESTIMATE_ONLY");
    expect(codes(inputs({ market: { ...audi.market, compsCount: 3 } }))).toContain("LOW_COMP_COUNT");
    expect(codes(inputs({ logistics: { distanceMiles: 500, method: "DEFAULT", yardZip: null, userZip: null, milesToPort: null } }))).toContain(
      "DISTANCE_ESTIMATED",
    );
  });

  it("no photo analysis and low confidence", () => {
    expect(codes(inputs({ damageFromPhotos: false }))).toContain("NO_PHOTO_ANALYSIS");
    expect(codes(inputs({ damage: { ...audi.damage, overall_confidence: 0.4 } }))).toContain("LOW_AI_CONFIDENCE");
  });

  it("vision red flags are mapped and contradictions raised to MEDIUM", () => {
    const d = { ...audi.damage, red_flags: [{ code: "listing_contradiction", message: "Listing says front, photos show rear.", level: "info" as const }] };
    const f = deriveFlags(inputs({ damage: d })).find((x) => x.code === "LISTING_CONTRADICTS_PHOTOS");
    expect(f?.level).toBe("MEDIUM");
  });

  it("sorts by severity", () => {
    const civic = findDemoFixtureById("civic-cod")!;
    const flags = deriveFlags(inputs({ listing: civic.listing(NOW), damage: civic.damage, vehicle: civic.vehicle }));
    expect(flags[0]!.level).toBe("HARD_STOP");
    expect(flags.at(-1)!.level).toBe("INFO");
  });
});

describe("checklist and narrative", () => {
  it("builds a checklist and template narrative", () => {
    const a = assemble({
      listing: audi.listing(NOW),
      vehicle: audi.vehicle,
      history: audi.history,
      damage: audi.damage,
      damageFromPhotos: true,
      repair: audi.repair,
      market: audi.market,
      logistics: { distanceMiles: 240, method: "FIXTURE", yardZip: null, userZip: null, milesToPort: null },
      feeSchedules: { LICENSED_DEALER: placeholderFeeSchedule(), PUBLIC_VIA_BROKER: placeholderFeeSchedule() },
      buyerType: "LICENSED_DEALER",
      exportProfile: null,
      destinationResale: null,
      now: NOW,
    });
    expect(a.checklist).toEqual(expect.arrayContaining([expect.stringMatching(/TX's rebuilt-title/), expect.stringMatching(/NICB/)]));
    const calc = runAnalysisCalc(a.base, assumptionsFromSettings(DEFAULT_SETTINGS));
    const text = templateNarrative({ calc, currentBid: 2100, flags: a.flags, checklist: a.checklist });
    expect(text).toContain("do not bid above $3,100");
    expect(text).toContain("$2,518");
    expect(
      buildChecklist({
        flags: [],
        damage: { ...audi.damage, photo_coverage: { ...audi.damage.photo_coverage, missing_critical_angles: [] } },
        listing: { ...audi.listing(NOW), hasKeys: null },
      }),
    ).toEqual(expect.arrayContaining([expect.stringMatching(/keys are included/)]));
  });
});
