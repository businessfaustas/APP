import { describe, expect, it } from "vitest";

import { aggregateRepair } from "@/lib/calc/repair";
import { findDemoFixtureById } from "@/lib/demo/fixtures";
import type { PartSource } from "@/lib/domain/schemas";

import { heuristicDamage } from "../heuristicDamage";
import { LABOR_BY_KEY, matchPartKey, placeholderPrice } from "../referenceData";
import { buildRepairEstimate, clampHours, type PriceLookup } from "../repairEstimator";
import { applyRules } from "../rules";

const audi = findDemoFixtureById("audi-a3")!;
const tesla = findDemoFixtureById("model3-side")!;
const camry = findDemoFixtureById("camry-flood")!;
const NOW = new Date("2026-10-01T00:00:00Z");

const lookup: PriceLookup = {
  reference(partKey: string, source: PartSource) {
    const ref = LABOR_BY_KEY.get(partKey);
    return ref ? placeholderPrice(ref, "premium", source) : null;
  },
  labor() {
    return null; // fall back to in-code reference data
  },
};

describe("part name matching", () => {
  it.each([
    ["Front bumper cover", "front_bumper_cover"],
    ["Headlamp assembly LH", "headlamp_assembly"],
    ["Hood panel", "hood_panel"],
    ["Fender LH", "fender"],
    ["Radiator support", "radiator_support"],
    ["A/C condenser", "ac_condenser"],
    ["Driver frontal airbag", "driver_airbag"],
    ["Passenger frontal airbag", "passenger_airbag"],
    ["Seat belt pretensioner LH", "seat_belt_pretensioner"],
    ["Four-wheel alignment", "sublet_alignment"],
    ["ADAS calibration", "sublet_adas_calibration"],
    ["Quarter panel RH", "quarter_panel"],
  ])("%s → %s", (name, key) => {
    expect(matchPartKey(name)).toBe(key);
  });
  it("returns null for unknown parts", () => {
    expect(matchPartKey("Flux capacitor")).toBeNull();
  });
});

describe("hour clamping", () => {
  it("clamps AI hours into the reference range", () => {
    expect(clampHours(40, 1.2, 2.5)).toEqual({ low: 1.2, mid: 2.5, high: 2.5 });
    expect(clampHours(2, 1.2, 2.5)).toEqual({ low: 1.2, mid: 2, high: 2.5 });
    expect(clampHours(0, 1, 3)).toEqual({ low: 1, mid: 2, high: 3 });
    expect(clampHours(2, 0, 0)).toEqual({ low: 1.4, mid: 2, high: 2.6 });
  });
});

describe("buildRepairEstimate", () => {
  it("prices the Audi vision result from reference data and adds rule lines", async () => {
    const est = await buildRepairEstimate({ damage: audi.damage, vehicle: audi.vehicle, listing: audi.listing(NOW), lookup });
    const keys = est.lineItems.map((l) => l.partKey);
    expect(keys).toEqual(expect.arrayContaining(["front_bumper_cover", "headlamp_assembly", "radiator_support", "sublet_alignment", "sublet_adas_calibration", "sublet_ac_recharge"]));
    expect(est.severity).toBe(5);
    expect(est.baseContingencyBps).toBe(1500);
    const bumper = est.lineItems.find((l) => l.partKey === "front_bumper_cover")!;
    expect(bumper.origin).toBe("VISIBLE");
    expect(bumper.prices.AFTERMARKET).not.toBeNull();
    expect(bumper.bodyHours.mid).toBe(2);
    const fender = est.lineItems.find((l) => l.partKey === "fender")!;
    expect(fender.action).toBe("REPAIR");
    const fan = est.lineItems.find((l) => l.partKey === "cooling_fan")!;
    expect(fan.origin).toBe("HIDDEN_LIKELY");
    const adas = est.lineItems.find((l) => l.partKey === "sublet_adas_calibration")!;
    expect(adas.probability).toBe(0.45); // raised by the ADAS rule
    expect(est.lineItems.every((l) => l.action !== "REPLACE" || l.prices.AFTERMARKET || l.prices.OEM_NEW || l.prices.USED)).toBe(true);
    const expected = aggregateRepair(est.lineItems, "expected", { partsSourcePreference: "AFTERMARKET", contingencyOverrideBps: null }, est.baseContingencyBps);
    expect(expected.partsCost).toBeGreaterThan(1500);
  });

  it("uses the AI price function for unknown parts and falls back to placeholders", async () => {
    const damage = { ...audi.damage, damaged_parts: [{ ...audi.damage.damaged_parts[0]!, part_name: "Flux capacitor" }], likely_hidden_damage: [] };
    const withAi = await buildRepairEstimate({
      damage,
      vehicle: audi.vehicle,
      listing: audi.listing(NOW),
      lookup,
      aiPrices: async (parts) => parts.map((p) => ({ index: p.index, OEM_NEW: { low: 900, high: 1100 }, AFTERMARKET: null, USED: null })),
    });
    const flux = withAi.lineItems.find((l) => l.partName === "Flux capacitor")!;
    expect(flux.priceOrigin).toBe("AI_ESTIMATE");
    expect(flux.prices.OEM_NEW).toEqual({ low: 900, mid: 1000, high: 1100 });

    const noAi = await buildRepairEstimate({ damage, vehicle: audi.vehicle, listing: audi.listing(NOW), lookup });
    const flux2 = noAi.lineItems.find((l) => l.partName === "Flux capacitor")!;
    expect(flux2.prices.AFTERMARKET).not.toBeNull();
    expect(flux2.confidence).toBeLessThanOrEqual(0.35);
  });
});

describe("rules", () => {
  it("airbags + EV side impact", () => {
    const rules = applyRules(tesla.damage, tesla.vehicle, tesla.listing(NOW));
    const keys = rules.map((r) => r.partKey);
    expect(keys).toEqual(expect.arrayContaining(["srs_module", "seat_belt_pretensioner", "sublet_srs_diag", "sublet_frame_measure", "sublet_hv_battery_inspection"]));
  });
  it("flood adds cleaning, battery, fluids and diagnostics", () => {
    const rules = applyRules(camry.damage, camry.vehicle, camry.listing(NOW));
    expect(rules.map((r) => r.partName)).toEqual(expect.arrayContaining(["Interior cleaning & sanitizing", "12V battery", "Diagnostic scan"]));
  });
  it("missing keys and non-starters add sublets", () => {
    const l = { ...audi.listing(NOW), hasKeys: false, runCondition: "WONT_START" as const };
    const keys = applyRules(audi.damage, audi.vehicle, l).map((r) => r.partKey);
    expect(keys).toEqual(expect.arrayContaining(["sublet_key_programming", "sublet_diagnostic"]));
  });
});

describe("heuristic damage (no AI)", () => {
  it("builds a low-confidence assessment from the damage text", () => {
    const d = heuristicDamage({ ...audi.listing(NOW), primaryDamage: "FRONT END", secondaryDamage: "LEFT SIDE" }, "No AI key configured.");
    expect(d.overall_confidence).toBeLessThan(0.5);
    expect(d.damaged_parts.map((p) => p.part_name)).toEqual(expect.arrayContaining(["Front bumper cover", "Front door shell LH"]));
    expect(d.severity_score).toBe(5);
    const flood = heuristicDamage({ ...audi.listing(NOW), primaryDamage: "WATER/FLOOD", secondaryDamage: null }, "x");
    expect(flood.severity_score).toBe(8);
    expect(flood.flood_indicators.length).toBe(1);
    const roll = heuristicDamage({ ...audi.listing(NOW), primaryDamage: "ROLLOVER", secondaryDamage: null }, "x");
    expect(roll.frame_damage_suspected).toBe(true);
    expect(roll.severity_score).toBe(9);
  });
});
