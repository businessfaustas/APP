/**
 * Derives risk flags from everything the pipeline gathered. Pure — unit tested.
 * Levels: HARD_STOP forces WALK AWAY; HIGH/MEDIUM feed the verdict and deal score; INFO is advisory.
 */
import type { FeeSchedule } from "@/lib/calc/types";
import { interpretDamageText } from "@/lib/domain/damageZones";
import type {
  DamageAssessment,
  HistoryReport,
  LogisticsInfo,
  MarketValuation,
  NormalizedListing,
  RepairEstimate,
  RiskFlag,
  VehicleInfo,
} from "@/lib/domain/schemas";

export interface FlagInputs {
  listing: NormalizedListing;
  vehicle: VehicleInfo;
  history: HistoryReport | null;
  damage: DamageAssessment;
  damageFromPhotos: boolean;
  repair: RepairEstimate;
  market: MarketValuation;
  logistics: LogisticsInfo;
  feeSchedule: FeeSchedule;
  now: Date;
}

function norm(s: string | null | undefined): string {
  return (s ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

const CRITICAL_ANGLES = ["engine_bay", "undercarriage", "interior"];

export function deriveFlags(i: FlagInputs): RiskFlag[] {
  const flags: RiskFlag[] = [];
  const add = (f: RiskFlag) => {
    if (!flags.some((x) => x.code === f.code)) flags.push(f);
  };
  const { listing: l, vehicle: v, damage: d } = i;
  const dmgHint = interpretDamageText(`${l.primaryDamage ?? ""} ${l.secondaryDamage ?? ""}`);

  // ── Title ──
  if (l.titleCategory === "NON_REPAIRABLE")
    add({
      code: "TITLE_NON_REPAIRABLE",
      level: "HARD_STOP",
      title: "Non-repairable title — it can't be returned to the road",
      detail: `${l.titleRaw ?? "Non-repairable"}: only parts or (in some cases) export resale are possible.`,
      source: "LISTING",
    });
  if (l.titleCategory === "PARTS_ONLY")
    add({
      code: "TITLE_PARTS_ONLY",
      level: "HARD_STOP",
      title: "Parts-only title",
      detail: "Sold as parts only — it can't be titled for road use.",
      source: "LISTING",
    });

  // ── Flood / fire / structure ──
  const flood = l.titleCategory === "FLOOD" || dmgHint.flags.includes("FLOOD") || d.flood_indicators.length >= 2;
  if (flood)
    add({
      code: "FLOOD_SUSPECTED",
      level: "HIGH",
      title: "Flood / water damage",
      detail: d.flood_indicators.length
        ? d.flood_indicators.join("; ")
        : "The listing reports water/flood damage. Electronics problems often appear months later.",
      source: d.flood_indicators.length ? "VISION" : "LISTING",
    });
  if (dmgHint.flags.includes("FIRE") || d.fire_indicators.length > 0)
    add({
      code: "FIRE_DAMAGE",
      level: "HIGH",
      title: "Fire / burn damage",
      detail: d.fire_indicators.join("; ") || "The listing reports burn damage.",
      source: d.fire_indicators.length ? "VISION" : "LISTING",
    });
  if (d.frame_damage_suspected)
    add({
      code: "FRAME_DAMAGE_SUSPECTED",
      level: "HIGH",
      title: "Frame / structural damage suspected",
      detail: d.frame_evidence || "Structural indicators visible in the photos.",
      source: "VISION",
    });
  if (d.engine_bay_intact === false)
    add({ code: "ENGINE_BAY_DAMAGE", level: "HIGH", title: "Engine bay damaged", detail: "The photos show damage inside the engine bay.", source: "VISION" });
  if (dmgHint.flags.includes("ROLLOVER") || d.impact_zones.some((z) => z.zone === "roof" && z.severity >= 6))
    add({
      code: "ROLLOVER_ROOF",
      level: "HIGH",
      title: "Rollover / roof damage",
      detail: "Roof and pillar repairs are major structural work.",
      source: "LISTING",
    });
  if (dmgHint.flags.includes("MECHANICAL"))
    add({
      code: "MECHANICAL_DAMAGE",
      level: "HIGH",
      title: "Mechanical damage reported",
      detail: "Engine or transmission condition is unknown — price in a replacement.",
      source: "LISTING",
    });
  if (dmgHint.flags.includes("BIOHAZARD"))
    add({ code: "BIOHAZARD", level: "HIGH", title: "Biohazard / chemical", detail: "Professional remediation required.", source: "LISTING" });
  if (dmgHint.flags.includes("STRIPPED"))
    add({
      code: "STRIPPED",
      level: "HIGH",
      title: "Stripped vehicle",
      detail: "Missing parts are not visible in an estimate — inspect carefully.",
      source: "LISTING",
    });

  // ── EV ──
  const evRisk =
    (v.isEv || v.isHybrid) &&
    (d.red_flags.some((f) => /HV|BATTERY/i.test(f.code)) ||
      d.impact_zones.some((z) => (z.zone === "undercarriage" && z.severity >= 3) || ((z.zone === "left_side" || z.zone === "right_side") && z.severity >= 5)) ||
      dmgHint.flags.includes("UNDERCARRIAGE"));
  if (evRisk)
    add({
      code: "EV_HV_BATTERY_RISK",
      level: "HIGH",
      title: "High-voltage battery risk",
      detail: "Underbody or side impact on an electrified vehicle. A damaged battery pack can cost more than the car.",
      source: "VISION",
    });

  // ── Odometer ──
  if (l.odometerBrand === "NOT_ACTUAL" || l.odometerBrand === "EXCEEDS_MECHANICAL_LIMITS")
    add({
      code: "ODOMETER_NOT_ACTUAL",
      level: "HIGH",
      title: "Odometer not actual",
      detail: "True mileage unknown — resale value drops sharply.",
      source: "LISTING",
    });
  if (l.odometerBrand === "EXEMPT")
    add({ code: "ODOMETER_EXEMPT", level: "INFO", title: "Odometer exempt", detail: "Older vehicles are exempt from odometer disclosure.", source: "LISTING" });
  if (d.odometer_reading_visible !== null && l.odometer !== null && Math.abs(d.odometer_reading_visible - l.odometer) > Math.max(500, l.odometer * 0.05))
    add({
      code: "ODOMETER_MISMATCH",
      level: "MEDIUM",
      title: "Odometer differs from the photos",
      detail: `Listing ${l.odometer.toLocaleString("en-US")} vs. ${d.odometer_reading_visible.toLocaleString("en-US")} visible in the photos.`,
      source: "VISION",
    });

  // ── VIN cross-check ──
  if (v.decodeSource.startsWith("NHTSA") && l.make && v.make) {
    const makeMismatch = !norm(v.make).includes(norm(l.make)) && !norm(l.make).includes(norm(v.make));
    const yearMismatch = l.year !== null && v.year !== null && l.year !== v.year;
    if (makeMismatch || yearMismatch)
      add({
        code: "VIN_MISMATCH",
        level: "HIGH",
        title: "VIN doesn't match the listing",
        detail: `VIN decodes to ${[v.year, v.make, v.model].filter(Boolean).join(" ")}; listing says ${[l.year, l.make, l.model].filter(Boolean).join(" ")}.`,
        source: "VIN",
      });
  }

  // ── History ──
  const h = i.history;
  if (h) {
    if (h.totalLossEvents > 1)
      add({
        code: "PRIOR_SALVAGE_EVENTS",
        level: "HIGH",
        title: "Previous total-loss events",
        detail: `${h.totalLossEvents} junk/salvage/insurance records — this car has been totaled before.`,
        source: "HISTORY",
      });
    if (h.theftRecords > 0)
      add({
        code: "THEFT_RECORD",
        level: "MEDIUM",
        title: "Theft record",
        detail: "Check that the title is clear and the VIN plates are original.",
        source: "HISTORY",
      });
    const readings = [...h.odometerRecords].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
    if (readings.some((r, idx) => idx > 0 && r.reading + 1000 < readings[idx - 1]!.reading))
      add({
        code: "ODOMETER_INCONSISTENT",
        level: "HIGH",
        title: "Odometer rollback suspected",
        detail: "A later odometer record is lower than an earlier one.",
        source: "HISTORY",
      });
  } else {
    add({
      code: "HISTORY_UNAVAILABLE",
      level: "INFO",
      title: "No title history checked",
      detail: "Add a VinAudit key for NMVTIS title/odometer history, or check NICB VINCheck for free.",
      source: "SYSTEM",
    });
  }

  // ── Condition ──
  if (d.airbag_deployed)
    add({
      code: "AIRBAGS_DEPLOYED",
      level: "MEDIUM",
      title: "Airbags deployed",
      detail: d.airbags_deployed_list.join(", ") || "Airbag deployment visible.",
      source: "VISION",
    });
  if (l.runCondition === "WONT_START")
    add({
      code: "DOES_NOT_START",
      level: "MEDIUM",
      title: "Doesn't start",
      detail: "Assume engine, electrical or transmission problems until proven otherwise.",
      source: "LISTING",
    });
  else if (l.runCondition === "STARTS")
    add({
      code: "STARTS_NOT_VERIFIED_DRIVE",
      level: "INFO",
      title: "Starts — driving not verified",
      detail: "The auction only verified that the engine starts.",
      source: "LISTING",
    });
  if (l.hasKeys === false)
    add({ code: "KEYS_MISSING", level: "MEDIUM", title: "No keys", detail: "Key programming has been added to the estimate.", source: "LISTING" });
  if (d.suspension_damage_suspected)
    add({
      code: "SUSPENSION_DAMAGE",
      level: "MEDIUM",
      title: "Suspension damage suspected",
      detail: "Wheel position or tire angle looks wrong.",
      source: "VISION",
    });
  const missing = d.photo_coverage.missing_critical_angles.filter((a) => CRITICAL_ANGLES.includes(a));
  if (i.damageFromPhotos && missing.length > 0)
    add({
      code: "LOW_PHOTO_COVERAGE",
      level: "MEDIUM",
      title: "Missing key photos",
      detail: `No ${missing.map((m) => m.replace("_", " ")).join(", ")} photos — hidden damage can't be ruled out.`,
      source: "VISION",
    });
  if (!i.damageFromPhotos)
    add({
      code: "NO_PHOTO_ANALYSIS",
      level: "MEDIUM",
      title: "Photos weren't analyzed",
      detail: "The estimate is based on the listing's damage description only.",
      source: "SYSTEM",
    });
  if (i.damageFromPhotos && d.overall_confidence < 0.5)
    add({
      code: "LOW_AI_CONFIDENCE",
      level: "MEDIUM",
      title: "Low AI confidence",
      detail: `The photo audit is only ${Math.round(d.overall_confidence * 100)}% confident.`,
      source: "VISION",
    });
  for (const rf of d.red_flags) {
    const level = rf.level === "high" ? "HIGH" : rf.level === "medium" ? "MEDIUM" : "INFO";
    const code = /CONTRADICT|MISMATCH|LISTING/i.test(rf.code) ? "LISTING_CONTRADICTS_PHOTOS" : rf.code.toUpperCase().replace(/[^A-Z0-9_]/g, "_");
    if (code === "FLOOD_SUSPECTED" || code === "EV_HV_BATTERY_RISK") continue; // handled above
    add({
      code,
      level: code === "LISTING_CONTRADICTS_PHOTOS" && level === "INFO" ? "MEDIUM" : level,
      title: rf.message.slice(0, 80),
      detail: rf.message,
      source: "VISION",
    });
  }

  // ── Sale ──
  if (l.saleStatus === "ON_APPROVAL")
    add({ code: "SALE_ON_APPROVAL", level: "MEDIUM", title: "Sale on approval", detail: "The seller can reject the winning bid.", source: "LISTING" });
  if (l.saleDate && new Date(l.saleDate).getTime() < i.now.getTime())
    add({ code: "SALE_ENDED", level: "INFO", title: "Sale date has passed", detail: "This lot may already be sold.", source: "LISTING" });
  if (v.recalls.length > 0)
    add({
      code: "OPEN_RECALLS",
      level: "MEDIUM",
      title: `${v.recalls.length} recall${v.recalls.length > 1 ? "s" : ""} for this model year`,
      detail: "Recall repairs are free at a dealer — check the VIN-specific status.",
      source: "VIN",
    });

  // ── Advisory ──
  if (i.repair.lineItems.some((x) => x.partKey === "sublet_adas_calibration" && x.included))
    add({
      code: "ADAS_CALIBRATION_LIKELY",
      level: "INFO",
      title: "ADAS calibration likely",
      detail: "Front radar/camera calibration is often required after front-end or windshield work.",
      source: "VISION",
    });
  if (v.vehicleClass === "premium" || v.vehicleClass === "luxury")
    add({
      code: "PREMIUM_PARTS_COST",
      level: "INFO",
      title: "Premium-brand parts",
      detail: "Lighting, sensors and trim cost more than on mainstream cars.",
      source: "VIN",
    });
  if (dmgHint.flags.includes("HAIL"))
    add({ code: "HAIL_DAMAGE", level: "INFO", title: "Hail damage", detail: "Usually paintless dent repair (PDR) — get a PDR quote.", source: "LISTING" });
  if (i.market.provider === "NONE")
    add({
      code: "MARKET_VALUE_MISSING",
      level: "INFO",
      title: "Market value needed",
      detail: "No market data source is configured — enter the clean retail value.",
      source: "MARKET",
    });
  else if (i.market.provider.startsWith("AI") || i.market.provider.startsWith("Auction ACV"))
    add({
      code: "MARKET_ESTIMATE_ONLY",
      level: "INFO",
      title: "Market value is an estimate",
      detail: "Not based on real comps — verify against local listings.",
      source: "MARKET",
    });
  else if (i.market.compsCount < 5 && i.market.comps.length > 0)
    add({ code: "LOW_COMP_COUNT", level: "INFO", title: "Few comparable listings", detail: `Only ${i.market.compsCount} comps found.`, source: "MARKET" });
  if (i.feeSchedule.isPlaceholder)
    add({
      code: "FEE_TABLE_PLACEHOLDER",
      level: "INFO",
      title: "Approximate fee table",
      detail: "Fees use a placeholder schedule — verify on the auction's official fee page.",
      source: "CALC",
    });
  else if (i.feeSchedule.verifiedAt && i.now.getTime() - new Date(i.feeSchedule.verifiedAt).getTime() > 90 * 86400000)
    add({ code: "FEE_TABLE_STALE", level: "INFO", title: "Fee table may be out of date", detail: "Last verified more than 90 days ago.", source: "CALC" });
  if (i.logistics.method === "DEFAULT")
    add({
      code: "DISTANCE_ESTIMATED",
      level: "INFO",
      title: "Distance estimated",
      detail: "The yard location couldn't be resolved — transport uses a default distance.",
      source: "SYSTEM",
    });

  const order = { HARD_STOP: 0, HIGH: 1, MEDIUM: 2, INFO: 3 } as const;
  return flags.sort((a, b) => order[a.level] - order[b.level]);
}
