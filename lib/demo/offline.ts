/**
 * Runs a demo fixture through the pure assemble → calculate path with default settings and
 * placeholder fees. No DB, no network — used by the landing page sample and by tests.
 */
import { assumptionsFromSettings, DEFAULT_SETTINGS, runAnalysisCalc } from "@/lib/calc/build";
import { placeholderFeeSchedule } from "@/lib/calc/placeholderFees";
import { assemble } from "@/lib/pipeline/assemble";

import { findDemoFixtureById } from "./fixtures";

export function runDemoFixtureOffline(id: string, now: Date) {
  const fx = findDemoFixtureById(id);
  if (!fx) throw new Error(`Unknown demo fixture ${id}`);
  const listing = fx.listing(now);
  const yard = fx.source === "IAAI" ? "IAAI" : "COPART";
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
      LICENSED_DEALER: placeholderFeeSchedule(yard, "LICENSED_DEALER"),
      PUBLIC_VIA_BROKER: placeholderFeeSchedule(yard, "PUBLIC_VIA_BROKER"),
    },
    buyerType: "LICENSED_DEALER",
    exportProfile: null,
    destinationResale: null,
    now,
  });
  const calc = runAnalysisCalc(assembled.base, assumptionsFromSettings(DEFAULT_SETTINGS));
  return { fx, listing, assembled, calc };
}
