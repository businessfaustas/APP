/**
 * Deterministic expansion of predictable collateral repairs (e.g. deployed airbags →
 * SRS module + pretensioners). Pure — unit tested.
 */
import type { DamageAssessment, DamageZone, NormalizedListing, VehicleInfo } from "@/lib/domain/schemas";

export interface RuleLine {
  partKey: string | null;
  partName: string;
  zone: DamageZone;
  kind: "PART" | "SUBLET";
  origin: "RULE" | "HIDDEN_LIKELY";
  probability: number;
  reason: string;
  /** fixed price range for items without a reference (e.g. interior cleaning) */
  fixedPrice?: { low: number; mid: number; high: number };
}

function zoneSeverity(d: DamageAssessment, zones: DamageZone[]): number {
  return Math.max(0, ...d.impact_zones.filter((z) => zones.includes(z.zone)).map((z) => z.severity));
}

export function applyRules(d: DamageAssessment, v: VehicleInfo, l: NormalizedListing): RuleLine[] {
  const out: RuleLine[] = [];
  const add = (r: RuleLine) => {
    if (!out.some((x) => x.partKey !== null && x.partKey === r.partKey && x.partName === r.partName)) out.push(r);
  };
  const front = zoneSeverity(d, ["front", "front_left", "front_right"]);
  const rear = zoneSeverity(d, ["rear", "rear_left", "rear_right"]);
  const side = zoneSeverity(d, ["left_side", "right_side"]);
  const under = zoneSeverity(d, ["undercarriage"]);
  const partNames = d.damaged_parts.map((p) => p.part_name.toLowerCase());

  if (d.airbag_deployed) {
    add({
      partKey: "srs_module",
      partName: "SRS control module",
      zone: "interior",
      kind: "PART",
      origin: "HIDDEN_LIKELY",
      probability: 0.6,
      reason: "Airbags deployed — the module usually needs replacement or a crash-data reset.",
    });
    const frontal = d.airbags_deployed_list.some((a) => /driver|passenger|frontal|steering|dash/i.test(a));
    if (frontal) {
      add({
        partKey: "seat_belt_pretensioner",
        partName: "Seat belt pretensioner (driver)",
        zone: "interior",
        kind: "PART",
        origin: "HIDDEN_LIKELY",
        probability: 0.8,
        reason: "Pretensioners fire with frontal airbags.",
      });
      add({
        partKey: "seat_belt_pretensioner",
        partName: "Seat belt pretensioner (passenger)",
        zone: "interior",
        kind: "PART",
        origin: "HIDDEN_LIKELY",
        probability: 0.7,
        reason: "Pretensioners fire with frontal airbags.",
      });
      add({
        partKey: "clock_spring",
        partName: "Clock spring",
        zone: "interior",
        kind: "PART",
        origin: "HIDDEN_LIKELY",
        probability: 0.3,
        reason: "Often damaged when the driver airbag deploys.",
      });
    } else {
      add({
        partKey: "seat_belt_pretensioner",
        partName: "Seat belt pretensioner (impact side)",
        zone: "interior",
        kind: "PART",
        origin: "HIDDEN_LIKELY",
        probability: 0.7,
        reason: "Side airbags deployed.",
      });
    }
    add({
      partKey: "sublet_srs_diag",
      partName: "SRS diagnostic & reset",
      zone: "interior",
      kind: "SUBLET",
      origin: "RULE",
      probability: 1,
      reason: "Required after any airbag deployment.",
    });
  }

  if (front >= 5) {
    if (!partNames.some((n) => n.includes("condenser")))
      add({
        partKey: "ac_condenser",
        partName: "A/C condenser",
        zone: "front",
        kind: "PART",
        origin: "HIDDEN_LIKELY",
        probability: 0.6,
        reason: "Sits behind the bumper in a front impact.",
      });
    if (!partNames.some((n) => n.includes("radiator") && !n.includes("support")))
      add({
        partKey: "radiator",
        partName: "Radiator",
        zone: "front",
        kind: "PART",
        origin: "HIDDEN_LIKELY",
        probability: 0.5,
        reason: "Front impact through the support.",
      });
    if (!partNames.some((n) => n.includes("fan")))
      add({
        partKey: "cooling_fan",
        partName: "Cooling fan assembly",
        zone: "front",
        kind: "PART",
        origin: "HIDDEN_LIKELY",
        probability: 0.35,
        reason: "Behind the radiator.",
      });
    if (v.turbo && !partNames.some((n) => n.includes("intercooler")))
      add({
        partKey: "intercooler",
        partName: "Intercooler",
        zone: "front",
        kind: "PART",
        origin: "HIDDEN_LIKELY",
        probability: 0.4,
        reason: "Turbo engine — the intercooler sits low in the front.",
      });
    add({
      partKey: "sublet_ac_recharge",
      partName: "A/C evacuate & recharge",
      zone: "engine_bay",
      kind: "SUBLET",
      origin: "HIDDEN_LIKELY",
      probability: 0.6,
      reason: "Needed if the condenser or lines are replaced.",
    });
    add({
      partKey: "sublet_coolant",
      partName: "Coolant & fluids",
      zone: "engine_bay",
      kind: "SUBLET",
      origin: "HIDDEN_LIKELY",
      probability: 0.5,
      reason: "Needed if the cooling system is opened.",
    });
  }

  if (d.suspension_damage_suspected || partNames.some((n) => /wheel|tire|knuckle|control arm/.test(n))) {
    add({
      partKey: "control_arm",
      partName: "Front lower control arm",
      zone: "front_left",
      kind: "PART",
      origin: "HIDDEN_LIKELY",
      probability: 0.6,
      reason: "Wheel/suspension damage visible.",
    });
    add({
      partKey: "tie_rod",
      partName: "Tie rod",
      zone: "front_left",
      kind: "PART",
      origin: "HIDDEN_LIKELY",
      probability: 0.5,
      reason: "Wheel/suspension damage visible.",
    });
    add({
      partKey: "sublet_alignment",
      partName: "Four-wheel alignment",
      zone: "undercarriage",
      kind: "SUBLET",
      origin: "RULE",
      probability: 1,
      reason: "Required after suspension repairs.",
    });
  } else if (Math.max(front, rear, side) >= 4) {
    add({
      partKey: "sublet_alignment",
      partName: "Four-wheel alignment",
      zone: "undercarriage",
      kind: "SUBLET",
      origin: "HIDDEN_LIKELY",
      probability: 0.5,
      reason: "Recommended after a moderate impact.",
    });
  }

  if (v.hasAdasLikely && front >= 3) {
    const windshield = partNames.some((n) => n.includes("windshield"));
    add({
      partKey: "sublet_adas_calibration",
      partName: "ADAS calibration",
      zone: "front",
      kind: "SUBLET",
      origin: "HIDDEN_LIKELY",
      probability: windshield ? 0.8 : 0.45,
      reason: "Front radar/camera usually need calibration after front-end or windshield work.",
    });
  }

  const structural =
    d.frame_damage_suspected ||
    d.damaged_parts.some((p) => p.category === "structural" && p.action !== "INSPECT" && /rail|apron|pillar|rocker|floor|quarter|roof/i.test(p.part_name));
  if (structural)
    add({
      partKey: "sublet_frame_measure",
      partName: "Frame measuring & pull",
      zone: "undercarriage",
      kind: "SUBLET",
      origin: d.frame_damage_suspected ? "RULE" : "HIDDEN_LIKELY",
      probability: d.frame_damage_suspected ? 1 : 0.5,
      reason: "Structural parts involved.",
    });

  if (l.hasKeys === false)
    add({
      partKey: "sublet_key_programming",
      partName: "Key programming / new key",
      zone: "interior",
      kind: "SUBLET",
      origin: "RULE",
      probability: 1,
      reason: "Listing says no keys.",
    });
  if (l.runCondition === "WONT_START")
    add({
      partKey: "sublet_diagnostic",
      partName: "Diagnostic scan",
      zone: "engine_bay",
      kind: "SUBLET",
      origin: "RULE",
      probability: 1,
      reason: "Vehicle does not start.",
    });

  if (v.isEv && (under >= 3 || side >= 5 || d.red_flags.some((f) => /HV|BATTERY/i.test(f.code)))) {
    add({
      partKey: "sublet_hv_battery_inspection",
      partName: "High-voltage battery inspection",
      zone: "undercarriage",
      kind: "SUBLET",
      origin: "RULE",
      probability: 1,
      reason: "EV with underbody or side impact.",
    });
  }

  const flood = d.flood_indicators.length >= 2 || /WATER|FLOOD/.test(l.primaryDamage ?? "") || l.titleCategory === "FLOOD";
  if (flood) {
    add({
      partKey: null,
      partName: "Interior cleaning & sanitizing",
      zone: "interior",
      kind: "SUBLET",
      origin: "RULE",
      probability: 1,
      reason: "Flood vehicle.",
      fixedPrice: { low: 300, mid: 400, high: 600 },
    });
    add({
      partKey: "battery_12v",
      partName: "12V battery",
      zone: "engine_bay",
      kind: "PART",
      origin: "RULE",
      probability: 1,
      reason: "Standard on flood vehicles.",
    });
    add({
      partKey: "sublet_coolant",
      partName: "Fluid flush (oil, transmission, brake)",
      zone: "engine_bay",
      kind: "SUBLET",
      origin: "RULE",
      probability: 1,
      reason: "Water contamination risk.",
    });
    add({
      partKey: "sublet_diagnostic",
      partName: "Diagnostic scan",
      zone: "engine_bay",
      kind: "SUBLET",
      origin: "RULE",
      probability: 1,
      reason: "Electronics check on a flood car.",
    });
    add({
      partKey: null,
      partName: "Electrical modules (BCM/ECM)",
      zone: "interior",
      kind: "PART",
      origin: "HIDDEN_LIKELY",
      probability: 0.45,
      reason: "Modules below the water line often fail later.",
      fixedPrice: { low: 300, mid: 600, high: 1200 },
    });
  }
  return out;
}
