import { dealScore } from "./dealScore";
import { auctionFees } from "./fees";
import { applyBps, hoursCost, ratioBps, sum } from "./money";
import { solveBid } from "./solver";
import type {
  AcquisitionBreakdown,
  CalcInput,
  CalcSettings,
  CalculationResult,
  RepairBreakdown,
  RepairInputs,
  ScenarioKey,
  ScenarioResult,
} from "./types";
import { SCENARIO_KEYS } from "./types";
import { decideVerdict } from "./verdict";

export function computeRepair(r: RepairInputs, s: Pick<CalcSettings, "partsDiscountBps" | "laborRate" | "paintMaterialsPerHour">): {
  total: number;
  breakdown: RepairBreakdown;
} {
  const parts = r.partsCost - applyBps(r.partsCost, s.partsDiscountBps);
  const labor = hoursCost(r.bodyHours + r.paintHours + r.mechHours, s.laborRate);
  const paintMaterials = hoursCost(r.paintHours, s.paintMaterialsPerHour);
  const subtotal = parts + labor + paintMaterials + r.subletCost;
  const total = applyBps(subtotal, 10000 + r.contingencyBps);
  return {
    total,
    breakdown: { parts, labor, paintMaterials, sublets: r.subletCost, contingency: total - subtotal },
  };
}

export function computeLogistics(input: CalcInput, s: CalcSettings): number {
  const ec = input.exportCosts;
  if (s.exitStrategy === "EXPORT" && ec) {
    return (
      ec.inlandToPort +
      ec.portAndLoading +
      ec.oceanFreight +
      ec.destinationPortFees +
      ec.customsBrokerFee +
      ec.registrationTax +
      ec.complianceConversion +
      ec.deliveryFromPort
    );
  }
  return Math.max(s.transportMin, Math.round((input.distanceMiles * s.transportCentsPerMile) / 100));
}

/** Everything that depends on the hammer price B. Non-decreasing in B. */
export function acquisitionAt(input: CalcInput, s: CalcSettings, bid: number): AcquisitionBreakdown {
  const fees = auctionFees(input.feeSchedule, bid);
  const salesTax = applyBps(bid, s.salesTaxBps);
  let marineInsurance = 0;
  let duty = 0;
  let vat = 0;
  const ec = input.exportCosts;
  if (s.exitStrategy === "EXPORT" && ec) {
    marineInsurance = applyBps(bid + fees.total, ec.marineInsuranceBps);
    const cif = bid + fees.total + s.brokerFee + ec.inlandToPort + ec.portAndLoading + ec.oceanFreight + marineInsurance;
    duty = applyBps(cif, ec.dutyBps);
    vat = ec.vatRecoverable ? 0 : applyBps(cif + duty, ec.vatBps);
  }
  const total = bid + fees.total + s.brokerFee + salesTax + marineInsurance + duty + vat;
  return { bid, fees, brokerFee: s.brokerFee, salesTax, marineInsurance, duty, vat, total };
}

function resaleFor(input: CalcInput, s: CalcSettings, key: ScenarioKey): number {
  const sc = input.scenarios[key];
  if (s.exitStrategy === "EXPORT" && sc.destinationResale !== undefined) return sc.destinationResale;
  return applyBps(sc.mvClean, s.rebuiltFactorBps);
}

/**
 * The deterministic financial engine. Pure: no I/O, no clock — identical results on the
 * server and in the browser.
 */
export function calculate(input: CalcInput, s: CalcSettings): CalculationResult {
  const logistics = computeLogistics(input, s);
  const admin = s.titleRegInspection + s.storageDays * s.storagePerDay;
  const extras = sum(input.extraFixedCosts.map((c) => c.amount));

  const partial = {} as Record<ScenarioKey, Omit<ScenarioResult, "profitAtMaxBid" | "totalCostAtMaxBid" | "roiAtMaxBidBps" | "profitAtCurrentBid">>;
  for (const key of SCENARIO_KEYS) {
    const sc = input.scenarios[key];
    const resale = resaleFor(input, s, key);
    const repair = computeRepair(sc.repair, s);
    const holding = sc.holdingDays * s.holdingCostPerDay;
    const selling = applyBps(resale, s.sellingCostBps) + s.sellingCostFixed;
    const nonAcquisitionCosts = repair.total + logistics + admin + holding + selling + extras;
    partial[key] = {
      resale,
      repair: repair.total,
      repairBreakdown: repair.breakdown,
      logistics,
      admin,
      holding,
      selling,
      extras,
      nonAcquisitionCosts,
    };
  }

  const targetProfit = Math.max(applyBps(partial.expected.resale, s.targetProfitBps), s.targetProfitMin);
  const acq = (bid: number) => acquisitionAt(input, s, bid).total;
  const ceiling = Math.max(0, partial.best.resale);

  const maxBid = solveBid(partial.expected.resale - partial.expected.nonAcquisitionCosts - targetProfit, acq, s.bidIncrement, ceiling);
  const comfortBid = solveBid(partial.worst.resale - partial.worst.nonAcquisitionCosts, acq, s.bidIncrement, ceiling);
  const breakEvenBid = solveBid(partial.expected.resale - partial.expected.nonAcquisitionCosts, acq, s.bidIncrement, ceiling);

  const acqAtMax = maxBid !== null ? acquisitionAt(input, s, maxBid) : null;
  const acqAtCurrent = input.currentBid !== null ? acquisitionAt(input, s, input.currentBid) : null;

  const scenarios = {} as Record<ScenarioKey, ScenarioResult>;
  for (const key of SCENARIO_KEYS) {
    const p = partial[key];
    const totalCostAtMaxBid = acqAtMax ? acqAtMax.total + p.nonAcquisitionCosts : null;
    const profitAtMaxBid = totalCostAtMaxBid !== null ? p.resale - totalCostAtMaxBid : null;
    scenarios[key] = {
      ...p,
      totalCostAtMaxBid,
      profitAtMaxBid,
      roiAtMaxBidBps: profitAtMaxBid !== null && totalCostAtMaxBid !== null ? ratioBps(profitAtMaxBid, totalCostAtMaxBid) : null,
      profitAtCurrentBid: acqAtCurrent ? p.resale - acqAtCurrent.total - p.nonAcquisitionCosts : null,
    };
  }

  const headroomBps =
    input.currentBid !== null && maxBid !== null && maxBid > 0 ? ratioBps(maxBid - input.currentBid, maxBid) : null;

  const { verdict, reasons } = decideVerdict({
    maxBid,
    currentBid: input.currentBid,
    headroomBps,
    signals: input.signals,
    worstProfitAtMaxBid: scenarios.worst.profitAtMaxBid,
    worstTotalCostAtMaxBid: scenarios.worst.totalCostAtMaxBid,
    expectedProfitAtMaxBid: scenarios.expected.profitAtMaxBid,
    expectedRoiAtMaxBidBps: scenarios.expected.roiAtMaxBidBps,
  });

  const score = dealScore({
    maxBid,
    currentBid: input.currentBid,
    headroomBps,
    signals: input.signals,
    worstProfitAtMaxBid: scenarios.worst.profitAtMaxBid,
    expectedRoiAtMaxBidBps: scenarios.expected.roiAtMaxBidBps,
  });

  return {
    targetProfit,
    scenarios,
    maxBid,
    comfortBid,
    breakEvenBid,
    feesAtMaxBid: acqAtMax ? acqAtMax.fees : null,
    acquisitionAtMaxBid: acqAtMax,
    headroomBps,
    verdict,
    verdictReasons: reasons,
    dealScore: score,
    waterfall: buildWaterfall(scenarios.expected, acquisitionAt(input, s, maxBid ?? 0)),
  };
}

function buildWaterfall(sc: ScenarioResult, acq: AcquisitionBreakdown): { key: string; label: string; amount: number }[] {
  const rows: { key: string; label: string; amount: number }[] = [
    { key: "resale", label: "Resale value", amount: sc.resale },
    { key: "bid", label: "Winning bid", amount: -acq.bid },
    { key: "fees", label: "Auction fees", amount: -acq.fees.total },
    { key: "broker", label: "Broker fee", amount: -acq.brokerFee },
    { key: "tax", label: "Sales tax", amount: -acq.salesTax },
    { key: "duty", label: "Duty, VAT & insurance", amount: -(acq.duty + acq.vat + acq.marineInsurance) },
    { key: "parts", label: "Parts", amount: -sc.repairBreakdown.parts },
    { key: "labor", label: "Labor", amount: -sc.repairBreakdown.labor },
    { key: "paint", label: "Paint materials", amount: -sc.repairBreakdown.paintMaterials },
    { key: "sublets", label: "Sublets", amount: -sc.repairBreakdown.sublets },
    { key: "contingency", label: "Contingency", amount: -sc.repairBreakdown.contingency },
    { key: "logistics", label: "Transport", amount: -sc.logistics },
    { key: "admin", label: "Title & admin", amount: -sc.admin },
    { key: "holding", label: "Holding", amount: -sc.holding },
    { key: "selling", label: "Selling costs", amount: -sc.selling },
    { key: "extras", label: "Other costs", amount: -sc.extras },
  ].filter((r) => r.key === "resale" || r.key === "bid" || r.amount !== 0);
  const profit = rows.reduce((acc, r) => acc + r.amount, 0);
  rows.push({ key: "profit", label: "Net profit", amount: profit });
  return rows;
}
