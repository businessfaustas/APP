/** Deterministic "Before you bid" checklist. Pure — unit tested. */
import type { DamageAssessment, NormalizedListing, RiskFlag } from "@/lib/domain/schemas";

export function buildChecklist(args: { flags: RiskFlag[]; damage: DamageAssessment; listing: NormalizedListing }): string[] {
  const { flags, damage: d, listing: l } = args;
  const has = (code: string) => flags.some((f) => f.code === code);
  const items: string[] = [];
  const missing = d.photo_coverage.missing_critical_angles;
  const frontHit = d.impact_zones.some((z) => z.zone.startsWith("front"));
  const rearHit = d.impact_zones.some((z) => z.zone.startsWith("rear"));

  if (missing.includes("undercarriage"))
    items.push(`Ask the yard for photos under the ${frontHit ? "front" : rearHit ? "rear" : "car"} (frame rails, subframe, crossmembers).`);
  if (missing.includes("engine_bay")) items.push("Get an engine-bay photo — check the radiator support, A/C lines and fluids.");
  if (missing.includes("interior")) items.push("Check interior photos for deployed airbags, water lines and a lit dash.");
  if (has("FRAME_DAMAGE_SUSPECTED")) items.push("Get a pre-purchase inspection or a frame measurement before bidding high.");
  if (has("FLOOD_SUSPECTED")) items.push("Inspect for water lines, silt, smell and corrosion; assume electronics will need work.");
  if (has("EV_HV_BATTERY_RISK")) items.push("Ask for a battery state-of-health / HV isolation report — a pack replacement can exceed the car's value.");
  if (has("AIRBAGS_DEPLOYED")) items.push("Budget for the SRS module and pretensioners; look for a torn dash (passenger airbag).");
  if (has("ADAS_CALIBRATION_LIKELY")) items.push("Budget ADAS calibration after the bumper or windshield work.");
  if (has("KEYS_MISSING")) items.push("No keys: confirm the key-programming cost with a locksmith for this model.");
  else if (l.hasKeys === null) items.push("Confirm with the yard that keys are included.");
  if (has("DOES_NOT_START")) items.push("Doesn't start: assume engine or transmission problems until proven otherwise.");
  if (has("SALE_ON_APPROVAL")) items.push("Sale is on approval — the seller can reject the high bid.");
  if (has("OPEN_RECALLS")) items.push("Check open recalls by VIN — dealers fix them free.");
  if (has("FEE_TABLE_PLACEHOLDER")) items.push("Verify the auction's current fee chart for your buyer type and payment method.");
  if (l.titleCategory === "SALVAGE" || l.titleCategory === "FLOOD")
    items.push(`Check ${l.titleState ? `${l.titleState}'s` : "your state's"} rebuilt-title inspection rules before buying.`);
  if (has("TITLE_NON_REPAIRABLE") || has("TITLE_PARTS_ONLY"))
    items.push("This title can't go back on the road — only buy it to part out or if export is allowed.");
  items.push("Plan pickup inside the free storage window to avoid daily storage fees.");
  items.push("Run the VIN through NICB VINCheck (free) for theft and total-loss records.");
  return [...new Set(items)];
}
