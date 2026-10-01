import "server-only";

import type { ModelMessage } from "ai";

import { DamageAssessmentSchema, type DamageAssessment, type NormalizedListing } from "@/lib/domain/schemas";

import { generateStructured } from "../client";

export const VISION_SYSTEM_PROMPT = `You are a senior collision damage appraiser and salvage-auction buyer with 20 years of experience.
You are reviewing auction photos for a professional car flipper deciding how much to bid.
Return ONLY data matching the provided JSON schema. Do NOT estimate prices.

RULES
1. Evidence first. Every item in damaged_parts must cite the photo numbers where it is visible.
   Anything inferred but not visible goes in likely_hidden_damage with a probability (0–1) and a reason.
2. Be conservative. Give each part a confidence (0–1). Dark, blurry, distant or low-resolution photos lower confidence.
3. Use standard collision-estimating part names, with LH/RH (LH = driver side on US vehicles), e.g.:
   Front bumper cover, Front bumper reinforcement, Bumper energy absorber, Grille, Headlamp assembly LH,
   Fog lamp RH, Hood panel, Fender LH, Radiator support, A/C condenser, Radiator, Intercooler,
   Cooling fan assembly, Front door shell RH, Quarter panel LH, Rocker panel LH, Roof panel, Windshield,
   Driver frontal airbag, Passenger frontal airbag, Knee airbag LH, Curtain airbag LH, Seat belt pretensioner LH,
   SRS control module, Front lower control arm LH, Steering knuckle LH, Wheel LH front, Tire RH rear,
   Front radar sensor, Windshield camera, Rear bumper cover, Trunk lid, Tail lamp LH, Rear body panel, Trunk floor.
4. Action: REPLACE (torn, kinked, cracked, deployed, structurally deformed), REPAIR (dents without kinks, accessible),
   REFINISH (paint only), INSPECT (cannot determine).
5. Structural indicators: buckled/kinked frame rails or aprons, shifted strut towers, uneven door/hood/fender gaps,
   radiator support displaced beyond the bumper area, wheel pushed back or visibly wrong camber/toe,
   pillar/roof deformation, windshield cracked from body flex, B-pillar intrusion. If present, set
   frame_damage_suspected=true and explain in frame_evidence.
6. Airbags: visible bag fabric, open steering-wheel cover, split dash, hanging curtain bags, deployed knee bag.
   List each deployed airbag. If any deployed, add seat belt pretensioners and SRS control module to likely_hidden_damage.
7. Flood: water line or silt on door panels/seats, mud in seat tracks or footwells, corrosion on seat rails/under-dash
   bolts, moisture in lamps or gauges, mildew. Fire: soot, melted plastics, burned wiring.
8. If there is no engine-bay photo, set engine_bay_intact=null and add "engine_bay" to missing_critical_angles.
   Do the same for interior, undercarriage and each side of the car.
9. Severity 1–10: 1–2 cosmetic; 3–4 bolt-on panels only; 5–6 bolt-on + cooling/lighting, possible minor structural
   (radiator support); 7–8 structural damage likely, airbags with major impact, suspension damage;
   9–10 severe structural, rollover, fire, flood with interior submersion, multiple impact zones.
10. Hours: per part, typical flat-rate times for a professional shop. Body hours = remove/install, replace, repair.
    Paint hours = refinish. Mech hours = suspension, cooling, A/C, mechanical.
11. Compare with the listing metadata. Report contradictions as red_flags (e.g., listing says "Front End" but
    photos show rear damage; visible odometer reading differs from the listing).
12. EV/hybrid: damage near the high-voltage battery, underbody impact, or orange HV cables damaged
    → red flag level "high".
13. Be concise. No marketing language.`;

export function listingContext(l: NormalizedListing): string {
  return [
    `Vehicle: ${[l.year, l.make, l.model, l.trim].filter(Boolean).join(" ") || "unknown"}`,
    `VIN: ${l.vin ?? "unknown"}`,
    `Odometer: ${l.odometer ?? "unknown"} ${l.odometerUnit} (${l.odometerBrand})`,
    `Title: ${l.titleRaw ?? l.titleCategory}`,
    `Primary damage (listing): ${l.primaryDamage ?? "unknown"}; secondary: ${l.secondaryDamage ?? "none"}`,
    `Run condition: ${l.runCondition}; keys: ${l.hasKeys === null ? "unknown" : l.hasKeys ? "yes" : "no"}`,
    `Fuel: ${l.fuel ?? "unknown"}; engine: ${l.engine ?? "unknown"}`,
  ].join("\n");
}

export async function runVisionAudit(args: {
  listing: NormalizedListing;
  photos: { index: number; bytes: Uint8Array; mediaType: string }[];
  analysisId: string;
}): Promise<DamageAssessment> {
  const content: Extract<ModelMessage, { role: "user" }>["content"] = [
    { type: "text", text: `Listing metadata:\n${listingContext(args.listing)}\n\nThere are ${args.photos.length} photos.` },
  ];
  for (const p of args.photos) {
    content.push({ type: "text", text: `Photo ${p.index}:` });
    content.push({ type: "image", image: p.bytes, mediaType: p.mediaType });
  }
  content.push({ type: "text", text: "Audit the damage now. Return JSON that matches the schema." });
  return generateStructured({
    purpose: "VISION",
    kind: "vision",
    schema: DamageAssessmentSchema,
    schemaName: "damage_assessment",
    instructions: VISION_SYSTEM_PROMPT,
    messages: [{ role: "user", content }],
    analysisId: args.analysisId,
    maxOutputTokens: 12000,
  });
}
