/**
 * Starter reference data for the repair estimator: typical labor times per part and
 * PLACEHOLDER price ranges. These are calibration starting points, not authoritative
 * data — admins should tune them with real invoices (Admin → Parts / Labor).
 */
import type { DamageZone, PartSource, VehicleClass } from "@/lib/domain/schemas";

export interface LaborRef {
  partKey: string;
  displayName: string;
  zone: DamageZone;
  category: string;
  kind: "PART" | "SUBLET";
  body: [number, number];
  paint: [number, number];
  mech: [number, number];
  /** Base aftermarket (or sublet) price range for a mainstream vehicle, USD. */
  basePrice: [number, number];
  /** false = no aftermarket version is usually available */
  aftermarket?: boolean;
  synonyms?: string[];
}

const P = (
  partKey: string,
  displayName: string,
  zone: DamageZone,
  category: string,
  body: [number, number],
  paint: [number, number],
  mech: [number, number],
  basePrice: [number, number],
  opts: { aftermarket?: boolean; synonyms?: string[] } = {},
): LaborRef => ({ partKey, displayName, zone, category, kind: "PART", body, paint, mech, basePrice, ...opts });

const S = (partKey: string, displayName: string, zone: DamageZone, basePrice: [number, number], synonyms: string[] = []): LaborRef => ({
  partKey,
  displayName,
  zone,
  category: "sublet",
  kind: "SUBLET",
  body: [0, 0],
  paint: [0, 0],
  mech: [0, 0],
  basePrice,
  synonyms,
});

export const LABOR_REFERENCE: LaborRef[] = [
  // Front
  P("front_bumper_cover", "Front bumper cover", "front", "body_panel", [1.2, 2.5], [2.0, 3.0], [0, 0], [180, 380], {
    synonyms: ["front bumper", "bumper cover front", "front fascia"],
  }),
  P("front_bumper_reinforcement", "Front bumper reinforcement", "front", "structural", [0.8, 1.5], [0, 0], [0, 0], [120, 260], {
    synonyms: ["bumper reinforcement", "impact bar", "rebar", "bumper reinforcement + absorber"],
  }),
  P("bumper_energy_absorber", "Bumper energy absorber", "front", "body_panel", [0.3, 0.6], [0, 0], [0, 0], [30, 90], {
    synonyms: ["absorber", "energy absorber", "foam absorber"],
  }),
  P("grille", "Grille", "front", "body_panel", [0.3, 0.8], [0, 0], [0, 0], [120, 280], { synonyms: ["front grille", "radiator grille"] }),
  P("headlamp_assembly", "Headlamp assembly", "front", "lighting", [0.5, 1.5], [0, 0], [0, 0], [180, 450], {
    synonyms: ["headlight", "headlamp", "head lamp", "led headlamp"],
  }),
  P("fog_lamp", "Fog lamp", "front", "lighting", [0.3, 0.6], [0, 0], [0, 0], [40, 120], { synonyms: ["fog light"] }),
  P("hood_panel", "Hood panel", "front", "body_panel", [1.0, 2.0], [2.0, 3.2], [0, 0], [200, 420], { synonyms: ["hood", "bonnet"] }),
  P("hood_hinge", "Hood hinge", "front", "body_panel", [0.4, 0.8], [0, 0], [0, 0], [25, 70]),
  P("fender", "Fender", "front_left", "body_panel", [1.5, 3.0], [1.8, 2.6], [0, 0], [90, 240], { synonyms: ["front fender", "wing"] }),
  P("fender_liner", "Fender liner", "front_left", "body_panel", [0.3, 0.5], [0, 0], [0, 0], [20, 60], {
    synonyms: ["wheelhouse liner", "inner fender liner", "splash shield"],
  }),
  P("radiator_support", "Radiator support", "front", "structural", [3.5, 6.5], [0, 1.5], [0, 0], [200, 380], {
    synonyms: ["core support", "radiator core support", "front end carrier"],
  }),
  P("ac_condenser", "A/C condenser", "front", "cooling", [0.8, 1.5], [0, 0], [0, 0.5], [110, 230], {
    synonyms: ["condenser", "a/c condenser", "ac condenser"],
  }),
  P("radiator", "Radiator", "front", "cooling", [0.8, 1.5], [0, 0], [0, 0.5], [120, 260], { synonyms: ["engine radiator"] }),
  P("intercooler", "Intercooler", "front", "cooling", [0.8, 1.5], [0, 0], [0, 0.5], [150, 350], { synonyms: ["charge air cooler"] }),
  P("cooling_fan", "Cooling fan assembly", "front", "cooling", [0.5, 1.0], [0, 0], [0.5, 1.5], [150, 320], {
    synonyms: ["radiator fan", "fan assembly", "cooling fan"],
  }),
  P("front_rail", "Front frame rail", "front", "structural", [6.0, 12.0], [1.0, 2.5], [0, 0], [250, 650], { synonyms: ["frame rail", "front rail", "rail"] }),
  P("apron", "Fender apron", "front", "structural", [3.0, 7.0], [1.0, 2.0], [0, 0], [150, 400], { synonyms: ["apron", "inner structure", "strut tower"] }),
  P("windshield", "Windshield", "front", "glass", [1.0, 1.5], [0, 0], [0, 0], [250, 500], { synonyms: ["front glass", "windscreen"] }),
  P("front_radar_sensor", "Front radar sensor", "front", "electrical_adas", [0.3, 0.6], [0, 0], [0, 0], [400, 900], {
    aftermarket: false,
    synonyms: ["radar", "acc sensor", "distance sensor"],
  }),
  P("windshield_camera", "Windshield camera", "front", "electrical_adas", [0.3, 0.6], [0, 0], [0, 0], [500, 1100], {
    aftermarket: false,
    synonyms: ["lane camera", "front camera"],
  }),
  P("parking_sensor", "Parking sensor", "front", "electrical_adas", [0.2, 0.4], [0.3, 0.5], [0, 0], [40, 120], { synonyms: ["park sensor", "pdc sensor"] }),
  // Sides
  P("front_door_shell", "Front door shell", "left_side", "body_panel", [2.5, 4.0], [2.0, 3.0], [0, 0], [300, 650], { synonyms: ["front door", "door shell"] }),
  P("rear_door_shell", "Rear door shell", "left_side", "body_panel", [2.5, 4.0], [2.0, 3.0], [0, 0], [300, 620], { synonyms: ["rear door"] }),
  P("door_mirror", "Door mirror", "left_side", "body_panel", [0.4, 0.8], [0.5, 1.0], [0, 0], [80, 250], {
    synonyms: ["side mirror", "mirror", "outside mirror"],
  }),
  P("rocker_panel", "Rocker panel", "left_side", "structural", [4.0, 8.0], [1.5, 2.5], [0, 0], [80, 220], { synonyms: ["sill", "rocker"] }),
  P("b_pillar", "B-pillar", "left_side", "structural", [8.0, 16.0], [1.5, 3.0], [0, 0], [150, 400], { synonyms: ["center pillar", "b pillar"] }),
  P("quarter_panel", "Quarter panel", "rear_left", "structural", [6.0, 12.0], [2.5, 3.5], [0, 0], [250, 600], { synonyms: ["rear quarter", "quarter"] }),
  P("door_glass", "Door glass", "left_side", "glass", [0.8, 1.2], [0, 0], [0, 0], [80, 220], { synonyms: ["side glass", "window glass"] }),
  // Rear
  P("rear_bumper_cover", "Rear bumper cover", "rear", "body_panel", [1.2, 2.5], [2.0, 3.0], [0, 0], [180, 380], { synonyms: ["rear bumper", "rear fascia"] }),
  P("rear_bumper_reinforcement", "Rear bumper reinforcement", "rear", "structural", [0.8, 1.5], [0, 0], [0, 0], [100, 240]),
  P("trunk_lid", "Trunk lid", "rear", "body_panel", [1.0, 2.0], [2.0, 3.0], [0, 0], [220, 480], { synonyms: ["decklid", "boot lid", "liftgate", "tailgate"] }),
  P("tail_lamp", "Tail lamp", "rear", "lighting", [0.3, 0.8], [0, 0], [0, 0], [90, 280], { synonyms: ["tail light", "taillight", "rear lamp"] }),
  P("rear_body_panel", "Rear body panel", "rear", "structural", [3.0, 6.0], [1.5, 2.5], [0, 0], [120, 320], { synonyms: ["back panel", "rear panel"] }),
  P("trunk_floor", "Trunk floor", "rear", "structural", [6.0, 12.0], [1.0, 2.0], [0, 0], [200, 450], { synonyms: ["trunk floor pan", "rear floor"] }),
  P("truck_bed", "Truck bed", "rear", "body_panel", [3.0, 6.0], [3.0, 5.0], [0, 0], [900, 2200], { synonyms: ["pickup box", "bed", "box side"] }),
  P("back_glass", "Back glass", "rear", "glass", [1.0, 1.5], [0, 0], [0, 0], [200, 450], { synonyms: ["rear window", "rear glass"] }),
  // Roof / glass
  P("roof_panel", "Roof panel", "roof", "structural", [8.0, 14.0], [3.0, 4.0], [0, 0], [300, 700], { synonyms: ["roof"] }),
  // Suspension / wheels
  P("control_arm", "Front lower control arm", "front_left", "suspension_steering", [0, 0], [0, 0], [0.8, 1.5], [60, 220], {
    synonyms: ["control arm", "lower control arm", "lca"],
  }),
  P("steering_knuckle", "Steering knuckle", "front_left", "suspension_steering", [0, 0], [0, 0], [1.5, 2.5], [120, 320], { synonyms: ["knuckle", "spindle"] }),
  P("tie_rod", "Tie rod", "front_left", "suspension_steering", [0, 0], [0, 0], [0.6, 1.2], [30, 90], { synonyms: ["tie rod end", "outer tie rod"] }),
  P("strut_assembly", "Strut assembly", "front_left", "suspension_steering", [0, 0], [0, 0], [1.0, 2.0], [90, 260], { synonyms: ["strut", "shock absorber"] }),
  P("wheel", "Wheel", "front_left", "wheels_tires", [0, 0], [0, 0], [0.3, 0.5], [100, 320], { synonyms: ["rim", "alloy wheel"] }),
  P("tire", "Tire", "front_left", "wheels_tires", [0, 0], [0, 0], [0.3, 0.5], [90, 220], { synonyms: ["tyre"] }),
  // Airbags / SRS
  P("driver_airbag", "Driver frontal airbag", "interior", "airbag_srs", [0.5, 1.0], [0, 0], [0, 0], [250, 600], {
    aftermarket: false,
    synonyms: ["steering wheel airbag", "driver airbag"],
  }),
  P("passenger_airbag", "Passenger frontal airbag", "interior", "airbag_srs", [1.0, 2.0], [0, 0], [0, 0], [300, 700], {
    aftermarket: false,
    synonyms: ["passenger airbag", "dash airbag"],
  }),
  P("knee_airbag", "Knee airbag", "interior", "airbag_srs", [0.5, 1.0], [0, 0], [0, 0], [200, 450], { aftermarket: false, synonyms: ["knee bag"] }),
  P("curtain_airbag", "Curtain airbag", "interior", "airbag_srs", [1.5, 3.0], [0, 0], [0, 0], [250, 600], {
    aftermarket: false,
    synonyms: ["side curtain", "curtain bag", "roof rail airbag"],
  }),
  P("seat_airbag", "Seat side airbag", "interior", "airbag_srs", [1.0, 2.0], [0, 0], [0, 0], [200, 450], { aftermarket: false }),
  P("seat_belt_pretensioner", "Seat belt pretensioner", "interior", "airbag_srs", [0.5, 1.0], [0, 0], [0, 0], [120, 320], {
    aftermarket: false,
    synonyms: ["seat belt", "pretensioner", "belt retractor"],
  }),
  P("srs_module", "SRS control module", "interior", "airbag_srs", [0.5, 1.0], [0, 0], [0, 0], [200, 550], {
    aftermarket: false,
    synonyms: ["airbag module", "srs module", "acm"],
  }),
  P("dashboard_panel", "Dashboard panel", "interior", "interior", [3.0, 7.0], [0, 0], [0, 0], [300, 900], {
    aftermarket: false,
    synonyms: ["dash", "instrument panel", "dashboard"],
  }),
  P("clock_spring", "Clock spring", "interior", "airbag_srs", [0.5, 1.0], [0, 0], [0, 0], [60, 200], { synonyms: ["spiral cable"] }),
  // Mechanical
  P("ac_compressor", "A/C compressor", "engine_bay", "mechanical", [0, 0], [0, 0], [1.5, 3.0], [200, 500], { synonyms: ["compressor"] }),
  P("engine_mount", "Engine mount", "engine_bay", "mechanical", [0, 0], [0, 0], [0.8, 2.0], [60, 200], { synonyms: ["motor mount"] }),
  P("battery_12v", "12V battery", "engine_bay", "electrical_adas", [0, 0], [0, 0], [0.3, 0.5], [130, 260], { synonyms: ["battery"] }),
  // Sublets
  S("sublet_alignment", "Four-wheel alignment", "undercarriage", [90, 160], ["alignment", "wheel alignment"]),
  S("sublet_ac_recharge", "A/C evacuate & recharge", "engine_bay", [130, 200], ["a/c recharge", "ac recharge", "refrigerant"]),
  S("sublet_adas_calibration", "ADAS calibration", "front", [180, 450], ["adas", "calibration", "radar calibration", "camera calibration"]),
  S("sublet_srs_diag", "SRS diagnostic & reset", "interior", [100, 200], ["srs diagnostic", "airbag light reset"]),
  S("sublet_crash_data_reset", "Crash data reset (SRS module)", "interior", [80, 180], ["crash data", "module reset"]),
  S("sublet_frame_measure", "Frame measuring & pull", "undercarriage", [350, 900], ["frame pull", "frame straightening", "measure"]),
  S("sublet_key_programming", "Key programming / new key", "interior", [200, 600], ["key", "keys", "key fob"]),
  S("sublet_diagnostic", "Diagnostic scan", "engine_bay", [100, 200], ["diagnostic", "scan"]),
  S("sublet_hv_battery_inspection", "High-voltage battery inspection", "undercarriage", [300, 900], ["hv battery", "battery inspection"]),
  S("sublet_coolant", "Coolant & fluids", "engine_bay", [40, 90], ["coolant", "fluids"]),
];

export const LABOR_BY_KEY: ReadonlyMap<string, LaborRef> = new Map(LABOR_REFERENCE.map((r) => [r.partKey, r]));

/** Price multipliers per vehicle class (vs mainstream). */
export const CLASS_MULTIPLIER: Record<VehicleClass, number> = {
  economy: 0.85,
  mainstream: 1,
  premium: 1.6,
  luxury: 2.4,
  truck_suv: 1.3,
  ev: 1.8,
};

/** Price multipliers per source (vs aftermarket). */
export const SOURCE_MULTIPLIER: Record<PartSource, number> = {
  AFTERMARKET: 1,
  OEM_NEW: 2.1,
  USED: 0.75,
};

function round10(n: number): number {
  return Math.round(n / 10) * 10;
}

/** Placeholder price range for one part/class/source, or null when that source doesn't exist. */
export function placeholderPrice(ref: LaborRef, vehicleClass: VehicleClass, source: PartSource): { low: number; high: number } | null {
  if (ref.kind === "SUBLET") {
    if (source !== "AFTERMARKET") return null;
    const m = vehicleClass === "luxury" || vehicleClass === "ev" ? 1.3 : vehicleClass === "premium" ? 1.15 : 1;
    return { low: round10(ref.basePrice[0] * m), high: round10(ref.basePrice[1] * m) };
  }
  if (source === "AFTERMARKET" && ref.aftermarket === false) return null;
  const m = CLASS_MULTIPLIER[vehicleClass] * SOURCE_MULTIPLIER[source];
  return { low: round10(ref.basePrice[0] * m), high: round10(ref.basePrice[1] * m) };
}

function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b(lh|rh|left|right|assembly|assy|panel|side)\b/g, "")
    .replace(/[^a-z0-9/ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Fuzzy-matches a free-text part name from the AI to a reference partKey.
 * Exact display-name or synonym matches win; otherwise the best token overlap ≥ 0.6.
 */
export function matchPartKey(partName: string): string | null {
  const name = normalizeName(partName);
  if (!name) return null;
  let best: { key: string; score: number } | null = null;
  for (const ref of LABOR_REFERENCE) {
    const candidates = [ref.displayName, ...(ref.synonyms ?? [])].map(normalizeName);
    for (const c of candidates) {
      if (!c) continue;
      if (c === name) return ref.partKey;
      const a = new Set(name.split(" "));
      const b = new Set(c.split(" "));
      const inter = [...a].filter((t) => b.has(t)).length;
      const score = inter / Math.max(a.size, b.size);
      if (!best || score > best.score) best = { key: ref.partKey, score };
    }
  }
  return best && best.score >= 0.6 ? best.key : null;
}
