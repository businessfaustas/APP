import { describe, expect, it } from "vitest";

import { assumptionsFromSettings, DEFAULT_SETTINGS, runAnalysisCalc } from "@/lib/calc/build";
import { placeholderFeeSchedule } from "@/lib/calc/placeholderFees";
import { DEMO_FIXTURES, findDemoFixtureById } from "@/lib/demo/fixtures";

import { assemble } from "../assemble";

const NOW = new Date("2026-10-01T12:00:00Z");

function run(id: string) {
  const fx = findDemoFixtureById(id)!;
  const listing = fx.listing(NOW);
  const assembled = assemble({
    listing,
    vehicle: fx.vehicle,
    history: fx.history,
    damage: fx.damage,
    damageFromPhotos: true,
    repair: fx.repair,
    market: fx.market,
    logistics: { distanceMiles: fx.distanceMiles, method: "FIXTURE", yardZip: listing.location.zip, userZip: "77002", milesToPort: null },
    feeSchedules: {
      LICENSED_DEALER: placeholderFeeSchedule(fx.source === "IAAI" ? "IAAI" : "COPART", "LICENSED_DEALER"),
      PUBLIC_VIA_BROKER: placeholderFeeSchedule(fx.source === "IAAI" ? "IAAI" : "COPART", "PUBLIC_VIA_BROKER"),
    },
    buyerType: "LICENSED_DEALER",
    exportProfile: null,
    destinationResale: null,
    now: NOW,
  });
  const calc = runAnalysisCalc(assembled.base, assumptionsFromSettings(DEFAULT_SETTINGS));
  return { fx, listing, assembled, calc };
}

describe("demo lots end to end (assemble → calculate)", () => {
  it("Audi A3 reproduces the reference case exactly", () => {
    const { assembled, calc } = run("audi-a3");
    const nonInfo = assembled.flags.filter((f) => f.level !== "INFO").map((f) => `${f.level}:${f.code}`);
    expect(nonInfo).toEqual(["MEDIUM:LOW_PHOTO_COVERAGE"]);
    expect(assembled.flags.map((f) => f.code)).toEqual(expect.arrayContaining(["ADAS_CALIBRATION_LIKELY", "PREMIUM_PARTS_COST", "FEE_TABLE_PLACEHOLDER"]));
    expect(calc.maxBid).toBe(3100);
    expect(calc.comfortBid).toBe(2375);
    expect(calc.breakEvenBid).toBe(5500);
    expect(calc.scenarios.expected.profitAtMaxBid).toBe(2518);
    expect(calc.verdict).toBe("GO");
    expect(calc.dealScore).toBe(73);
    expect(assembled.checklist[0]).toMatch(/under the front/);
  });

  it("Camry flood is BE_CAUTIOUS or WALK_AWAY", () => {
    const { assembled, calc } = run("camry-flood");
    expect(assembled.flags.some((f) => f.code === "FLOOD_SUSPECTED")).toBe(true);
    expect(["BE_CAUTIOUS", "WALK_AWAY"]).toContain(calc.verdict);
  });

  it("F-150 rear end is GO", () => {
    const { calc } = run("f150-rear");
    expect(calc.verdict).toBe("GO");
    expect(calc.maxBid!).toBeGreaterThan(6500);
  });

  it("Model 3 side impact is BE_CAUTIOUS", () => {
    const { assembled, calc } = run("model3-side");
    expect(assembled.flags.map((f) => f.code)).toEqual(expect.arrayContaining(["EV_HV_BATTERY_RISK", "FRAME_DAMAGE_SUSPECTED", "AIRBAGS_DEPLOYED"]));
    expect(calc.verdict).toBe("BE_CAUTIOUS");
  });

  it("Civic with a certificate of destruction is WALK_AWAY (hard stop)", () => {
    const { assembled, calc } = run("civic-cod");
    expect(assembled.flags[0]!.level).toBe("HARD_STOP");
    expect(calc.verdict).toBe("WALK_AWAY");
    expect(calc.verdictReasons[0]).toMatch(/Non-repairable/);
  });

  it("every fixture listing is schema-valid with photos", () => {
    for (const fx of DEMO_FIXTURES) {
      const l = fx.listing(NOW);
      expect(l.photoUrls.length).toBe(fx.photos.length);
      expect(l.vin).toHaveLength(17);
    }
  });
});
