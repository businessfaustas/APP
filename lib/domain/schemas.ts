/**
 * Core domain schemas (Zod). Every external input and every LLM output is validated
 * against these. Types are inferred from the schemas so there is one source of truth.
 * This module is isomorphic (safe in the browser).
 */
import { z } from "zod";

// ── Enumerations ─────────────────────────────────────────────────────────────

export const AUCTION_SOURCES = ["COPART", "IAAI", "BIDCARS", "AUTOBIDMASTER", "OTHER", "MANUAL"] as const;
export const AuctionSourceSchema = z.enum(AUCTION_SOURCES);
export type AuctionSource = z.infer<typeof AuctionSourceSchema>;

export const TITLE_CATEGORIES = ["CLEAN", "SALVAGE", "REBUILT", "NON_REPAIRABLE", "PARTS_ONLY", "FLOOD", "OTHER", "UNKNOWN"] as const;
export const TitleCategorySchema = z.enum(TITLE_CATEGORIES);
export type TitleCategory = z.infer<typeof TitleCategorySchema>;

export const RUN_CONDITIONS = ["RUNS_AND_DRIVES", "STARTS", "WONT_START", "UNKNOWN"] as const;
export const RunConditionSchema = z.enum(RUN_CONDITIONS);
export type RunCondition = z.infer<typeof RunConditionSchema>;

export const ODOMETER_BRANDS = ["ACTUAL", "NOT_ACTUAL", "EXEMPT", "EXCEEDS_MECHANICAL_LIMITS", "UNKNOWN"] as const;
export const OdometerBrandSchema = z.enum(ODOMETER_BRANDS);
export type OdometerBrand = z.infer<typeof OdometerBrandSchema>;

export const SALE_STATUSES = ["PURE_SALE", "MINIMUM_BID", "ON_APPROVAL", "BUY_NOW", "UNKNOWN"] as const;
export const SaleStatusSchema = z.enum(SALE_STATUSES);
export type SaleStatus = z.infer<typeof SaleStatusSchema>;

export const EXTRACTION_METHODS = ["FIXTURE", "PARSER", "LLM", "EXTENSION", "MANUAL"] as const;
export const ExtractionMethodSchema = z.enum(EXTRACTION_METHODS);

export const DAMAGE_ZONES = [
  "front",
  "front_left",
  "front_right",
  "left_side",
  "right_side",
  "rear",
  "rear_left",
  "rear_right",
  "roof",
  "undercarriage",
  "interior",
  "engine_bay",
] as const;
export const DamageZoneSchema = z.enum(DAMAGE_ZONES);
export type DamageZone = z.infer<typeof DamageZoneSchema>;

export const PART_SOURCES = ["OEM_NEW", "AFTERMARKET", "USED"] as const;
export const PartSourceSchema = z.enum(PART_SOURCES);
export type PartSource = z.infer<typeof PartSourceSchema>;

export const BUYER_TYPES = ["LICENSED_DEALER", "PUBLIC_VIA_BROKER"] as const;
export const BuyerTypeSchema = z.enum(BUYER_TYPES);
export type BuyerType = z.infer<typeof BuyerTypeSchema>;

export const EXIT_STRATEGIES = ["RETAIL_REBUILT", "EXPORT"] as const;
export const ExitStrategySchema = z.enum(EXIT_STRATEGIES);
export type ExitStrategy = z.infer<typeof ExitStrategySchema>;

export const VEHICLE_CLASSES = ["economy", "mainstream", "premium", "luxury", "truck_suv", "ev"] as const;
export const VehicleClassSchema = z.enum(VEHICLE_CLASSES);
export type VehicleClass = z.infer<typeof VehicleClassSchema>;

export const FLAG_LEVELS = ["HARD_STOP", "HIGH", "MEDIUM", "INFO"] as const;
export const FlagLevelSchema = z.enum(FLAG_LEVELS);
export type FlagLevel = z.infer<typeof FlagLevelSchema>;

// ── Listing ──────────────────────────────────────────────────────────────────

export const ListingLocationSchema = z.object({
  yardName: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  zip: z.string().nullable(),
});

export const NormalizedListingSchema = z.object({
  source: AuctionSourceSchema,
  sourceUrl: z.string().url().nullable(),
  lotNumber: z.string().nullable(),
  vin: z.string().length(17).nullable(),
  year: z.number().int().nullable(),
  make: z.string().nullable(),
  model: z.string().nullable(),
  trim: z.string().nullable(),
  odometer: z.number().int().nullable(),
  odometerUnit: z.enum(["mi", "km"]),
  odometerBrand: OdometerBrandSchema,
  titleRaw: z.string().nullable(),
  titleState: z.string().nullable(),
  titleCategory: TitleCategorySchema,
  primaryDamage: z.string().nullable(),
  secondaryDamage: z.string().nullable(),
  runCondition: RunConditionSchema,
  hasKeys: z.boolean().nullable(),
  engine: z.string().nullable(),
  transmission: z.string().nullable(),
  drive: z.string().nullable(),
  fuel: z.string().nullable(),
  color: z.string().nullable(),
  saleDate: z.string().datetime({ offset: true }).nullable(),
  saleStatus: SaleStatusSchema,
  currentBid: z.number().int().nullable(),
  buyNowPrice: z.number().int().nullable(),
  listedRetailValue: z.number().int().nullable(),
  location: ListingLocationSchema,
  sellerType: z.string().nullable(),
  photoUrls: z.array(z.string()),
  extractionMethod: ExtractionMethodSchema,
  warnings: z.array(z.string()),
});
export type NormalizedListing = z.infer<typeof NormalizedListingSchema>;

// ── Risk flags ───────────────────────────────────────────────────────────────

export const RiskFlagSchema = z.object({
  code: z.string(),
  level: FlagLevelSchema,
  title: z.string(),
  detail: z.string(),
  source: z.enum(["LISTING", "VIN", "HISTORY", "VISION", "MARKET", "CALC", "SYSTEM"]),
});
export type RiskFlag = z.infer<typeof RiskFlagSchema>;

// ── Repair line items ────────────────────────────────────────────────────────

export const PriceRangeSchema = z.object({
  low: z.number().int().min(0),
  mid: z.number().int().min(0),
  high: z.number().int().min(0),
});
export type PriceRange = z.infer<typeof PriceRangeSchema>;

export const HoursRangeSchema = z.object({
  low: z.number().min(0),
  mid: z.number().min(0),
  high: z.number().min(0),
});
export type HoursRange = z.infer<typeof HoursRangeSchema>;

export const ZERO_HOURS: HoursRange = { low: 0, mid: 0, high: 0 };

export const RepairLineItemSchema = z.object({
  id: z.string(),
  kind: z.enum(["PART", "SUBLET"]),
  partKey: z.string().nullable(),
  partName: z.string(),
  zone: DamageZoneSchema,
  side: z.enum(["LH", "RH", "CENTER", "BOTH", "NA"]),
  action: z.enum(["REPLACE", "REPAIR", "REFINISH", "INSPECT"]),
  origin: z.enum(["VISIBLE", "HIDDEN_LIKELY", "RULE"]),
  probability: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  photoRefs: z.array(z.number().int()),
  prices: z.object({
    OEM_NEW: PriceRangeSchema.nullable(),
    AFTERMARKET: PriceRangeSchema.nullable(),
    USED: PriceRangeSchema.nullable(),
  }),
  priceOrigin: z.enum(["REFERENCE", "AI_ESTIMATE", "USER", "FIXTURE"]),
  bodyHours: HoursRangeSchema,
  paintHours: HoursRangeSchema,
  mechHours: HoursRangeSchema,
  included: z.boolean(),
  userEdited: z.boolean(),
  /** Per-line parts source chosen by the user (null = follow the scenario rule). */
  selectedSource: PartSourceSchema.nullable(),
  /** Per-line price override by the user, applied in every scenario (null = none). */
  priceOverride: z.number().int().min(0).nullable(),
  reason: z.string().nullable(),
});
export type RepairLineItem = z.infer<typeof RepairLineItemSchema>;

export const RepairEstimateSchema = z.object({
  lineItems: z.array(RepairLineItemSchema),
  severity: z.number().int().min(1).max(10),
  baseContingencyBps: z.number().int().min(0),
  notes: z.array(z.string()),
});
export type RepairEstimate = z.infer<typeof RepairEstimateSchema>;

// ── Vision damage assessment (LLM output) ────────────────────────────────────

export const PHOTO_ANGLES = [
  "front",
  "front_left",
  "left",
  "rear_left",
  "rear",
  "rear_right",
  "right",
  "front_right",
  "interior_front",
  "interior_rear",
  "dashboard_odometer",
  "engine_bay",
  "trunk",
  "undercarriage",
  "roof",
  "wheels",
  "vin_plate",
  "other",
] as const;

export const PART_CATEGORIES = [
  "body_panel",
  "structural",
  "lighting",
  "glass",
  "cooling",
  "suspension_steering",
  "airbag_srs",
  "mechanical",
  "electrical_adas",
  "interior",
  "wheels_tires",
  "other",
] as const;

export const DamageAssessmentSchema = z.object({
  photo_coverage: z.object({
    angles_present: z.array(z.enum(PHOTO_ANGLES)),
    missing_critical_angles: z.array(z.string()),
    image_quality: z.enum(["good", "fair", "poor"]),
  }),
  photos: z.array(z.object({ index: z.number().int(), angle: z.string(), findings: z.string() })),
  impact_zones: z.array(z.object({ zone: DamageZoneSchema, severity: z.number().int().min(0).max(10), description: z.string() })),
  damaged_parts: z.array(
    z.object({
      part_name: z.string(),
      category: z.enum(PART_CATEGORIES),
      zone: DamageZoneSchema,
      side: z.enum(["LH", "RH", "CENTER", "BOTH", "NA"]),
      action: z.enum(["REPLACE", "REPAIR", "REFINISH", "INSPECT"]),
      photo_refs: z.array(z.number().int()),
      confidence: z.number().min(0).max(1),
      body_hours: z.number().min(0),
      paint_hours: z.number().min(0),
      mech_hours: z.number().min(0),
      notes: z.string().optional(),
    }),
  ),
  likely_hidden_damage: z.array(
    z.object({
      part_name: z.string(),
      zone: DamageZoneSchema,
      probability: z.number().min(0).max(1),
      reason: z.string(),
    }),
  ),
  severity_score: z.number().int().min(1).max(10),
  airbag_deployed: z.boolean(),
  airbags_deployed_list: z.array(z.string()),
  frame_damage_suspected: z.boolean(),
  frame_evidence: z.string(),
  suspension_damage_suspected: z.boolean(),
  engine_bay_intact: z.boolean().nullable(),
  flood_indicators: z.array(z.string()),
  fire_indicators: z.array(z.string()),
  interior_condition: z.enum(["good", "fair", "poor", "unknown"]),
  odometer_reading_visible: z.number().int().nullable(),
  red_flags: z.array(z.object({ code: z.string(), message: z.string(), level: z.enum(["high", "medium", "info"]) })),
  overall_confidence: z.number().min(0).max(1),
  summary: z.string(),
});
export type DamageAssessment = z.infer<typeof DamageAssessmentSchema>;

// ── Market valuation ─────────────────────────────────────────────────────────

export const CompSchema = z.object({
  price: z.number().int(),
  adjustedPrice: z.number().int(),
  mileage: z.number().int().nullable(),
  year: z.number().int().nullable(),
  trim: z.string().nullable(),
  distanceMiles: z.number().int().nullable(),
  sellerType: z.enum(["dealer", "private", "unknown"]),
  daysOnMarket: z.number().int().nullable(),
  url: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
});
export type Comp = z.infer<typeof CompSchema>;

export const ScenarioValuesSchema = z.object({
  best: z.number().int(),
  expected: z.number().int(),
  worst: z.number().int(),
});
export type ScenarioValues = z.infer<typeof ScenarioValuesSchema>;

export const MarketValuationSchema = z.object({
  provider: z.string(),
  isDemo: z.boolean(),
  confidence: z.number().min(0).max(1),
  compsCount: z.number().int(),
  comps: z.array(CompSchema),
  mvClean: ScenarioValuesSchema,
  medianDaysOnMarket: z.number().int().nullable(),
  mileageSlopePerMile: z.number().nullable(),
  notes: z.array(z.string()),
});
export type MarketValuation = z.infer<typeof MarketValuationSchema>;

// ── Vehicle info / history ───────────────────────────────────────────────────

export const RecallSchema = z.object({
  campaign: z.string(),
  component: z.string(),
  summary: z.string(),
  remedy: z.string().nullable(),
  reportDate: z.string().nullable(),
});
export type Recall = z.infer<typeof RecallSchema>;

export const VehicleInfoSchema = z.object({
  vin: z.string().nullable(),
  year: z.number().int().nullable(),
  make: z.string().nullable(),
  model: z.string().nullable(),
  trim: z.string().nullable(),
  bodyClass: z.string().nullable(),
  driveType: z.string().nullable(),
  engine: z.string().nullable(),
  fuelType: z.string().nullable(),
  transmission: z.string().nullable(),
  turbo: z.boolean(),
  vehicleClass: VehicleClassSchema,
  isEv: z.boolean(),
  isHybrid: z.boolean(),
  hasAdasLikely: z.boolean(),
  decodeSource: z.string(),
  recalls: z.array(RecallSchema),
  complaints: z.array(z.object({ component: z.string(), count: z.number().int() })),
});
export type VehicleInfo = z.infer<typeof VehicleInfoSchema>;

export const HistoryReportSchema = z.object({
  provider: z.string(),
  isDemo: z.boolean(),
  titleRecords: z.array(z.object({ date: z.string().nullable(), state: z.string().nullable(), brand: z.string() })),
  odometerRecords: z.array(z.object({ date: z.string().nullable(), reading: z.number().int() })),
  junkSalvageRecords: z.array(z.object({ date: z.string().nullable(), reportingEntity: z.string(), disposition: z.string().nullable() })),
  totalLossEvents: z.number().int(),
  theftRecords: z.number().int(),
  notes: z.array(z.string()),
});
export type HistoryReport = z.infer<typeof HistoryReportSchema>;

// ── Logistics ────────────────────────────────────────────────────────────────

export const LogisticsInfoSchema = z.object({
  distanceMiles: z.number().int().min(0),
  method: z.enum(["ZIP_CENTROID", "CITY_STATE", "DEFAULT", "FIXTURE", "USER"]),
  yardZip: z.string().nullable(),
  userZip: z.string().nullable(),
  milesToPort: z.number().int().nullable(),
});
export type LogisticsInfo = z.infer<typeof LogisticsInfoSchema>;

// ── Data source bookkeeping ──────────────────────────────────────────────────

export const DataSourceEntrySchema = z.object({
  provider: z.string(),
  isDemo: z.boolean(),
  ok: z.boolean(),
  note: z.string().nullable(),
});
export type DataSourceEntry = z.infer<typeof DataSourceEntrySchema>;
export const DataSourcesSchema = z.record(z.string(), DataSourceEntrySchema);
export type DataSources = z.infer<typeof DataSourcesSchema>;
