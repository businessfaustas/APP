/**
 * Pure assembly of everything the pipeline gathered into flags, a checklist and the
 * AnalysisBase the calculator (server and browser) runs on. No I/O — unit tested.
 */
import type { AnalysisBase, ExportProfileData } from "@/lib/calc/build";
import type { FeeSchedule } from "@/lib/calc/types";
import type { BuyerType, DamageAssessment, HistoryReport, LogisticsInfo, MarketValuation, NormalizedListing, RepairEstimate, RiskFlag, ScenarioValues, VehicleInfo } from "@/lib/domain/schemas";
import { buildChecklist } from "@/lib/flags/checklist";
import { deriveFlags } from "@/lib/flags/riskFlags";

export interface AssembleInput {
  listing: NormalizedListing;
  vehicle: VehicleInfo;
  history: HistoryReport | null;
  damage: DamageAssessment;
  damageFromPhotos: boolean;
  repair: RepairEstimate;
  market: MarketValuation;
  logistics: LogisticsInfo;
  feeSchedules: Record<BuyerType, FeeSchedule>;
  buyerType: BuyerType;
  exportProfile: ExportProfileData | null;
  destinationResale: ScenarioValues | null;
  now: Date;
}

export interface Assembled {
  flags: RiskFlag[];
  checklist: string[];
  base: AnalysisBase;
}

export function assemble(i: AssembleInput): Assembled {
  const flags = deriveFlags({
    listing: i.listing,
    vehicle: i.vehicle,
    history: i.history,
    damage: i.damage,
    damageFromPhotos: i.damageFromPhotos,
    repair: i.repair,
    market: i.market,
    logistics: i.logistics,
    feeSchedule: i.feeSchedules[i.buyerType],
    now: i.now,
  });
  const checklist = buildChecklist({ flags, damage: i.damage, listing: i.listing });
  const floodSuspected = flags.some((f) => f.code === "FLOOD_SUSPECTED");
  const base: AnalysisBase = {
    lineItems: i.repair.lineItems,
    baseContingencyBps: i.repair.baseContingencyBps,
    mvClean: i.market.mvClean,
    destinationResale: i.destinationResale,
    distanceMiles: i.logistics.distanceMiles,
    milesToPort: i.logistics.milesToPort,
    currentBid: i.listing.currentBid,
    feeSchedules: i.feeSchedules,
    exportProfile: i.exportProfile,
    signals: {
      severity: i.repair.severity,
      frameSuspected: i.damage.frame_damage_suspected,
      floodSuspected,
      airbagsDeployed: i.damage.airbag_deployed,
      overallConfidence: i.damage.overall_confidence,
      flags: flags.map((f) => ({ code: f.code, level: f.level, title: f.title })),
    },
    extraFixedCosts: [],
  };
  return { flags, checklist, base };
}
