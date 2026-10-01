/**
 * Fallback damage assessment built from the listing's damage description when no photos
 * can be analyzed (no AI key, no photos, or the vision step failed). Low confidence.
 */
import { interpretDamageText } from "@/lib/domain/damageZones";
import type { DamageAssessment, DamageZone, NormalizedListing } from "@/lib/domain/schemas";

type Part = DamageAssessment["damaged_parts"][number];

const P = (
  part_name: string,
  category: Part["category"],
  zone: DamageZone,
  action: Part["action"],
  body: number,
  paint: number,
  mech = 0,
  side: Part["side"] = "CENTER",
): Part => ({
  part_name,
  category,
  zone,
  side,
  action,
  photo_refs: [],
  confidence: 0.35,
  body_hours: body,
  paint_hours: paint,
  mech_hours: mech,
});

const ZONE_PARTS: Partial<Record<DamageZone, Part[]>> = {
  front: [
    P("Front bumper cover", "body_panel", "front", "REPLACE", 2, 2.5),
    P("Front bumper reinforcement", "structural", "front", "REPLACE", 1, 0),
    P("Grille", "body_panel", "front", "REPLACE", 0.5, 0),
    P("Headlamp assembly LH", "lighting", "front_left", "REPLACE", 0.8, 0, 0, "LH"),
    P("Hood panel", "body_panel", "front", "REPAIR", 2, 2.5),
    P("Radiator support", "structural", "front", "REPLACE", 4.5, 0),
  ],
  front_left: [
    P("Fender LH", "body_panel", "front_left", "REPAIR", 2.5, 2, 0, "LH"),
    P("Headlamp assembly LH", "lighting", "front_left", "REPLACE", 0.8, 0, 0, "LH"),
  ],
  front_right: [
    P("Fender RH", "body_panel", "front_right", "REPAIR", 2.5, 2, 0, "RH"),
    P("Headlamp assembly RH", "lighting", "front_right", "REPLACE", 0.8, 0, 0, "RH"),
  ],
  rear: [
    P("Rear bumper cover", "body_panel", "rear", "REPLACE", 2, 2.5),
    P("Rear bumper reinforcement", "structural", "rear", "REPLACE", 1, 0),
    P("Trunk lid", "body_panel", "rear", "REPAIR", 1.5, 2.5),
    P("Tail lamp LH", "lighting", "rear_left", "REPLACE", 0.4, 0, 0, "LH"),
    P("Rear body panel", "structural", "rear", "REPAIR", 3, 1.5),
  ],
  rear_left: [P("Quarter panel LH", "structural", "rear_left", "REPAIR", 4, 2.5, 0, "LH")],
  rear_right: [P("Quarter panel RH", "structural", "rear_right", "REPAIR", 4, 2.5, 0, "RH")],
  left_side: [
    P("Front door shell LH", "body_panel", "left_side", "REPLACE", 3, 2.5, 0, "LH"),
    P("Rear door shell LH", "body_panel", "left_side", "REPAIR", 2.5, 2.5, 0, "LH"),
  ],
  right_side: [
    P("Front door shell RH", "body_panel", "right_side", "REPLACE", 3, 2.5, 0, "RH"),
    P("Rear door shell RH", "body_panel", "right_side", "REPAIR", 2.5, 2.5, 0, "RH"),
  ],
  roof: [P("Roof panel", "structural", "roof", "REPAIR", 6, 3)],
  undercarriage: [P("Front lower control arm LH", "suspension_steering", "undercarriage", "REPLACE", 0, 0, 1.2, "LH")],
};

export function heuristicDamage(l: NormalizedListing, reason: string): DamageAssessment {
  const primary = interpretDamageText(l.primaryDamage);
  const secondary = interpretDamageText(l.secondaryDamage);
  const zones = [...new Set([...primary.zones, ...secondary.zones])];
  const flags = new Set([...primary.flags, ...secondary.flags]);
  const minor = /MINOR|SCRATCH/i.test(l.primaryDamage ?? "") && zones.length === 0;

  let severity = minor ? 2 : 5;
  if (flags.has("FLOOD")) severity = 8;
  if (flags.has("ROLLOVER") || flags.has("FIRE")) severity = 9;
  if (flags.has("HAIL")) severity = Math.max(4, severity - 1);
  if (zones.length >= 3) severity = Math.min(10, severity + 2);

  const parts: Part[] = [];
  for (const [i, z] of zones.entries()) {
    for (const p of ZONE_PARTS[z] ?? []) {
      if (!parts.some((x) => x.part_name === p.part_name)) parts.push({ ...p, action: i === 0 ? p.action : p.action === "REPLACE" ? "REPAIR" : p.action });
    }
  }
  if (flags.has("FLOOD")) {
    parts.push(P("Carpet & padding", "interior", "interior", "REPLACE", 4, 0));
  }
  if (flags.has("MECHANICAL")) parts.push(P("Engine / transmission inspection", "mechanical", "engine_bay", "INSPECT", 0, 0, 2));

  const hidden: DamageAssessment["likely_hidden_damage"] = [];
  if (flags.has("MECHANICAL"))
    hidden.push({ part_name: "Engine or transmission repair", zone: "engine_bay", probability: 0.5, reason: "Listing reports mechanical damage." });

  return {
    photo_coverage: {
      angles_present: [],
      missing_critical_angles: ["engine_bay", "undercarriage", "interior"],
      image_quality: "poor",
    },
    photos: [],
    impact_zones: zones.map((z, i) => ({
      zone: z,
      severity: i === 0 ? severity : Math.max(1, severity - 2),
      description: "From the listing's damage description.",
    })),
    damaged_parts: parts,
    likely_hidden_damage: hidden,
    severity_score: Math.max(1, Math.min(10, severity)),
    airbag_deployed: false,
    airbags_deployed_list: [],
    frame_damage_suspected: flags.has("ROLLOVER"),
    frame_evidence: flags.has("ROLLOVER") ? "Rollover reported by the listing." : "",
    suspension_damage_suspected: flags.has("UNDERCARRIAGE"),
    engine_bay_intact: null,
    flood_indicators: flags.has("FLOOD") ? ["Listing reports water/flood damage"] : [],
    fire_indicators: flags.has("FIRE") ? ["Listing reports burn damage"] : [],
    interior_condition: flags.has("FLOOD") ? "poor" : "unknown",
    odometer_reading_visible: null,
    red_flags: [],
    overall_confidence: zones.length > 0 ? 0.35 : 0.2,
    summary: `${reason} This estimate is based only on the listing's damage description (${[l.primaryDamage, l.secondaryDamage].filter(Boolean).join(", ") || "none given"}). Review and edit the repair lines.`,
  };
}
