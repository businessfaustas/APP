/**
 * Turns a damage assessment into priced repair line items:
 *  1. AI-visible parts → lines (hours clamped to reference ranges)
 *  2. hidden-damage suspicions → HIDDEN_LIKELY lines
 *  3. rules engine → collateral lines
 *  4. pricing: reference table → AI batch estimate → placeholder
 * Pure apart from the injected price lookups (unit tested with fakes).
 */
import { contingencyForSeverity } from "@/lib/calc/repair";
import type {
  DamageAssessment,
  HoursRange,
  NormalizedListing,
  PartSource,
  PriceRange,
  RepairEstimate,
  RepairLineItem,
  VehicleInfo,
} from "@/lib/domain/schemas";

import { LABOR_BY_KEY, matchPartKey, placeholderPrice, type LaborRef } from "./referenceData";
import { applyRules, type RuleLine } from "./rules";

export interface LaborRange {
  bodyLow: number;
  bodyHigh: number;
  paintLow: number;
  paintHigh: number;
  mechLow: number;
  mechHigh: number;
}

export interface PriceLookup {
  /** DB reference (null when no row) */
  reference(partKey: string, source: PartSource): { low: number; high: number } | null;
  labor(partKey: string): LaborRange | null;
}

export type AiPriceFn = (parts: { index: number; name: string; kind: "PART" | "SUBLET" }[]) => Promise<
  { index: number; OEM_NEW: { low: number; high: number } | null; AFTERMARKET: { low: number; high: number } | null; USED: { low: number; high: number } | null }[]
>;

const r1 = (n: number) => Math.round(n * 10) / 10;
const r10 = (n: number) => Math.round(n / 10) * 10;

function toRange(r: { low: number; high: number } | null): PriceRange | null {
  if (!r) return null;
  const low = Math.max(0, Math.round(Math.min(r.low, r.high)));
  const high = Math.max(low, Math.round(Math.max(r.low, r.high)));
  return { low, mid: Math.max(low, Math.min(high, r10((low + high) / 2))), high };
}

/** AI hours clamped into the reference range: low/high = range ends, mid = clamped AI value. */
export function clampHours(ai: number, low: number, high: number): HoursRange {
  if (high <= 0 && low <= 0) return ai > 0 ? { low: r1(ai * 0.7), mid: r1(ai), high: r1(ai * 1.3) } : { low: 0, mid: 0, high: 0 };
  const mid = Math.min(high, Math.max(low, ai > 0 ? ai : (low + high) / 2));
  return { low: r1(low), mid: r1(mid), high: r1(high) };
}

function unknownHours(ai: number): HoursRange {
  return ai > 0 ? { low: r1(ai * 0.7), mid: r1(ai), high: r1(ai * 1.3) } : { low: 0, mid: 0, high: 0 };
}

function sideOf(name: string): RepairLineItem["side"] {
  if (/\b(LH|left|driver)\b/i.test(name)) return "LH";
  if (/\b(RH|right|passenger)\b/i.test(name)) return "RH";
  return "NA";
}

function laborFor(partKey: string | null, lookup: PriceLookup): LaborRange | null {
  if (!partKey) return null;
  const db = lookup.labor(partKey);
  if (db) return db;
  const ref: LaborRef | undefined = LABOR_BY_KEY.get(partKey);
  return ref
    ? { bodyLow: ref.body[0], bodyHigh: ref.body[1], paintLow: ref.paint[0], paintHigh: ref.paint[1], mechLow: ref.mech[0], mechHigh: ref.mech[1] }
    : null;
}

let idCounter = 0;
function newId(prefix: string): string {
  idCounter = (idCounter + 1) % 1_000_000;
  return `${prefix}${Date.now().toString(36)}${idCounter.toString(36)}`;
}

export async function buildRepairEstimate(args: {
  damage: DamageAssessment;
  vehicle: VehicleInfo;
  listing: NormalizedListing;
  lookup: PriceLookup;
  aiPrices?: AiPriceFn | null;
}): Promise<RepairEstimate> {
  const { damage: d, vehicle: v, lookup } = args;
  const lines: RepairLineItem[] = [];
  const notes: string[] = [];

  // 1. visible parts
  for (const p of d.damaged_parts) {
    const partKey = matchPartKey(p.part_name);
    const ref = laborFor(partKey, lookup);
    const refinishOnly = p.action === "REFINISH";
    const inspect = p.action === "INSPECT";
    const body = refinishOnly ? { low: 0, mid: 0, high: 0 } : ref ? clampHours(p.body_hours, ref.bodyLow, ref.bodyHigh) : unknownHours(p.body_hours);
    const wantsPaint = p.paint_hours > 0 || refinishOnly;
    const paint = !wantsPaint
      ? { low: 0, mid: 0, high: 0 }
      : ref && ref.paintHigh > 0
        ? clampHours(p.paint_hours, ref.paintLow, ref.paintHigh)
        : unknownHours(p.paint_hours);
    const mech = ref ? clampHours(p.mech_hours, ref.mechLow, ref.mechHigh) : unknownHours(p.mech_hours);
    lines.push({
      id: newId("v"),
      kind: partKey?.startsWith("sublet_") ? "SUBLET" : "PART",
      partKey,
      partName: p.part_name,
      zone: p.zone,
      side: p.side === "NA" ? sideOf(p.part_name) : p.side,
      action: inspect ? "INSPECT" : p.action,
      origin: inspect ? "HIDDEN_LIKELY" : "VISIBLE",
      probability: inspect ? 0.5 : 1,
      confidence: p.confidence,
      photoRefs: p.photo_refs,
      prices: { OEM_NEW: null, AFTERMARKET: null, USED: null },
      priceOrigin: "REFERENCE",
      bodyHours: body,
      paintHours: paint,
      mechHours: p.mech_hours > 0 ? mech : { low: 0, mid: 0, high: 0 },
      included: true,
      userEdited: false,
      selectedSource: null,
      priceOverride: null,
      reason: p.notes ?? null,
    });
  }

  // 2. hidden-damage suspicions
  for (const h of d.likely_hidden_damage) {
    const partKey = matchPartKey(h.part_name);
    if (lines.some((x) => x.partKey !== null && x.partKey === partKey && x.zone === h.zone)) continue;
    const ref = laborFor(partKey, lookup);
    const kind = partKey?.startsWith("sublet_") ? "SUBLET" : "PART";
    lines.push({
      id: newId("h"),
      kind,
      partKey,
      partName: h.part_name,
      zone: h.zone,
      side: sideOf(h.part_name),
      action: kind === "SUBLET" ? "REPAIR" : "REPLACE",
      origin: "HIDDEN_LIKELY",
      probability: h.probability,
      confidence: Math.min(0.6, h.probability),
      photoRefs: [],
      prices: { OEM_NEW: null, AFTERMARKET: null, USED: null },
      priceOrigin: "REFERENCE",
      bodyHours: ref ? clampHours(0, ref.bodyLow, ref.bodyHigh) : kind === "PART" ? { low: 0.5, mid: 1, high: 1.5 } : { low: 0, mid: 0, high: 0 },
      paintHours: { low: 0, mid: 0, high: 0 },
      mechHours: ref && ref.mechHigh > 0 ? clampHours(0, ref.mechLow, ref.mechHigh) : { low: 0, mid: 0, high: 0 },
      included: true,
      userEdited: false,
      selectedSource: null,
      priceOverride: null,
      reason: h.reason,
    });
  }

  // 3. rules
  const ruleLines: RuleLine[] = applyRules(d, v, args.listing);
  for (const r of ruleLines) {
    const dup = lines.find((x) => (r.partKey !== null && x.partKey === r.partKey && (r.kind === "SUBLET" || x.partName === r.partName)) || x.partName.toLowerCase() === r.partName.toLowerCase());
    if (dup) {
      // a rule can only raise the probability of an existing hidden line
      if (dup.origin === "HIDDEN_LIKELY" && r.probability > dup.probability) {
        dup.probability = r.probability;
        if (r.origin === "RULE") dup.origin = "RULE";
      }
      continue;
    }
    const ref = laborFor(r.partKey, lookup);
    lines.push({
      id: newId("r"),
      kind: r.kind,
      partKey: r.partKey,
      partName: r.partName,
      zone: r.zone,
      side: sideOf(r.partName),
      action: r.kind === "SUBLET" ? "REPAIR" : "REPLACE",
      origin: r.origin,
      probability: r.probability,
      confidence: r.origin === "RULE" ? 0.8 : Math.min(0.6, r.probability),
      photoRefs: [],
      prices: r.fixedPrice ? { OEM_NEW: null, AFTERMARKET: r.fixedPrice, USED: null } : { OEM_NEW: null, AFTERMARKET: null, USED: null },
      priceOrigin: "REFERENCE",
      bodyHours: ref && r.kind === "PART" ? clampHours(0, ref.bodyLow, ref.bodyHigh) : { low: 0, mid: 0, high: 0 },
      paintHours: { low: 0, mid: 0, high: 0 },
      mechHours: ref && ref.mechHigh > 0 ? clampHours(0, ref.mechLow, ref.mechHigh) : { low: 0, mid: 0, high: 0 },
      included: true,
      userEdited: false,
      selectedSource: null,
      priceOverride: null,
      reason: r.reason,
    });
  }

  // 4. pricing
  const needsPrice = (l: RepairLineItem) => (l.kind === "SUBLET" || l.action === "REPLACE") && !l.prices.AFTERMARKET && !l.prices.OEM_NEW && !l.prices.USED;
  const unpriced: RepairLineItem[] = [];
  for (const l of lines) {
    if (!needsPrice(l)) continue;
    if (l.partKey) {
      const prices = {
        OEM_NEW: toRange(lookup.reference(l.partKey, "OEM_NEW")),
        AFTERMARKET: toRange(lookup.reference(l.partKey, "AFTERMARKET")),
        USED: toRange(lookup.reference(l.partKey, "USED")),
      };
      if (prices.OEM_NEW || prices.AFTERMARKET || prices.USED) {
        l.prices = prices;
        l.priceOrigin = "REFERENCE";
        continue;
      }
    }
    unpriced.push(l);
  }

  if (unpriced.length > 0 && args.aiPrices) {
    try {
      const est = await args.aiPrices(unpriced.map((l, i) => ({ index: i, name: l.partName, kind: l.kind })));
      for (const e of est) {
        const l = unpriced[e.index];
        if (!l) continue;
        const prices = { OEM_NEW: toRange(e.OEM_NEW), AFTERMARKET: toRange(e.AFTERMARKET), USED: toRange(e.USED) };
        if (prices.OEM_NEW || prices.AFTERMARKET || prices.USED) {
          l.prices = prices;
          l.priceOrigin = "AI_ESTIMATE";
          l.confidence = Math.min(l.confidence, 0.5);
        }
      }
      notes.push("Some part prices are AI estimates — verify with your supplier.");
    } catch (err) {
      console.error("AI part pricing failed", err);
    }
  }

  for (const l of lines) {
    if (!needsPrice(l)) continue;
    const ref = l.partKey ? LABOR_BY_KEY.get(l.partKey) : undefined;
    const generic: LaborRef = ref ?? {
      partKey: "generic",
      displayName: l.partName,
      zone: l.zone,
      category: "other",
      kind: l.kind,
      body: [0, 0],
      paint: [0, 0],
      mech: [0, 0],
      basePrice: l.kind === "SUBLET" ? [150, 400] : [150, 450],
    };
    l.prices = {
      OEM_NEW: toRange(placeholderPrice(generic, v.vehicleClass, "OEM_NEW")),
      AFTERMARKET: toRange(placeholderPrice(generic, v.vehicleClass, "AFTERMARKET")),
      USED: toRange(placeholderPrice(generic, v.vehicleClass, "USED")),
    };
    l.priceOrigin = "REFERENCE";
    l.confidence = Math.min(l.confidence, ref ? 0.6 : 0.35);
  }

  const severity = Math.max(1, Math.min(10, d.severity_score));
  if (lines.length === 0) notes.push("No damaged parts were identified — add repair lines manually if needed.");
  return {
    lineItems: lines,
    severity,
    baseContingencyBps: contingencyForSeverity(severity),
    notes,
  };
}
