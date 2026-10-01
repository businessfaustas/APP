/**
 * Financial engine types. All money is integer whole USD; all percentages are
 * integer basis points (1500 = 15%).
 */
import type { AuctionSource, BuyerType, ExitStrategy, FlagLevel, PartSource } from "@/lib/domain/schemas";

export type ScenarioKey = "best" | "expected" | "worst";
export const SCENARIO_KEYS: readonly ScenarioKey[] = ["best", "expected", "worst"] as const;

export interface FeeTier {
  /** inclusive */
  min: number;
  /** exclusive; null = no upper bound */
  max: number | null;
  /** flat fee for this tier */
  amount?: number;
  /** percentage of the bid in bps (used when amount is not set) */
  bps?: number;
  /** minimum when bps is used */
  minAmount?: number;
}

export interface FeeSchedule {
  id: string;
  source: AuctionSource;
  buyerType: BuyerType;
  name: string;
  buyerFeeTiers: FeeTier[];
  onlineBidFeeTiers: FeeTier[];
  fixedFees: { label: string; amount: number }[];
  isPlaceholder: boolean;
  verifiedAt: string | null;
  sourceUrl: string | null;
}

export interface FeeBreakdown {
  lines: { label: string; amount: number }[];
  total: number;
}

export interface RepairInputs {
  /** $ before the parts discount */
  partsCost: number;
  bodyHours: number;
  paintHours: number;
  mechHours: number;
  /** alignment, A/C, ADAS calibration, SRS reset, key programming, diagnostics… */
  subletCost: number;
  contingencyBps: number;
}

export interface ScenarioInput {
  /** Clean retail value already adjusted for mileage and list-to-sale ratio. */
  mvClean: number;
  /** Export mode only, already converted to USD. */
  destinationResale?: number;
  repair: RepairInputs;
  holdingDays: number;
}

export interface CalcSettings {
  laborRate: number;
  paintMaterialsPerHour: number;
  partsDiscountBps: number;
  rebuiltFactorBps: number;
  targetProfitBps: number;
  targetProfitMin: number;
  transportCentsPerMile: number;
  transportMin: number;
  titleRegInspection: number;
  storageDays: number;
  storagePerDay: number;
  holdingCostPerDay: number;
  sellingCostBps: number;
  sellingCostFixed: number;
  salesTaxBps: number;
  brokerFee: number;
  bidIncrement: number;
  exitStrategy: ExitStrategy;
}

export interface ExportCostInputs {
  inlandToPort: number;
  portAndLoading: number;
  oceanFreight: number;
  marineInsuranceBps: number;
  destinationPortFees: number;
  customsBrokerFee: number;
  dutyBps: number;
  vatBps: number;
  vatRecoverable: boolean;
  registrationTax: number;
  complianceConversion: number;
  deliveryFromPort: number;
}

export interface FlagLike {
  code: string;
  level: FlagLevel;
  title?: string;
}

export interface VerdictSignals {
  severity: number;
  frameSuspected: boolean;
  floodSuspected: boolean;
  airbagsDeployed: boolean;
  overallConfidence: number;
  flags: FlagLike[];
}

export interface CalcInput {
  scenarios: Record<ScenarioKey, ScenarioInput>;
  distanceMiles: number;
  feeSchedule: FeeSchedule;
  exportCosts?: ExportCostInputs;
  extraFixedCosts: { label: string; amount: number }[];
  currentBid: number | null;
  signals: VerdictSignals;
}

export interface RepairBreakdown {
  parts: number;
  labor: number;
  paintMaterials: number;
  sublets: number;
  contingency: number;
}

export interface ScenarioResult {
  resale: number;
  repair: number;
  repairBreakdown: RepairBreakdown;
  logistics: number;
  admin: number;
  holding: number;
  selling: number;
  extras: number;
  /** repair + logistics + admin + holding + selling + extras */
  nonAcquisitionCosts: number;
  profitAtMaxBid: number | null;
  totalCostAtMaxBid: number | null;
  roiAtMaxBidBps: number | null;
  profitAtCurrentBid: number | null;
}

export type VerdictValue = "GO" | "BE_CAUTIOUS" | "WALK_AWAY";

export interface AcquisitionBreakdown {
  bid: number;
  fees: FeeBreakdown;
  brokerFee: number;
  salesTax: number;
  marineInsurance: number;
  duty: number;
  vat: number;
  total: number;
}

export interface CalculationResult {
  targetProfit: number;
  scenarios: Record<ScenarioKey, ScenarioResult>;
  maxBid: number | null;
  comfortBid: number | null;
  breakEvenBid: number | null;
  feesAtMaxBid: FeeBreakdown | null;
  acquisitionAtMaxBid: AcquisitionBreakdown | null;
  headroomBps: number | null;
  verdict: VerdictValue;
  verdictReasons: string[];
  dealScore: number;
  waterfall: { key: string; label: string; amount: number }[];
}

/** Line-item level knobs used by aggregateRepair (also driven by the What-if panel). */
export interface RepairAggregationSettings {
  partsSourcePreference: PartSource;
  /** null = use the severity-based base contingency */
  contingencyOverrideBps: number | null;
}
