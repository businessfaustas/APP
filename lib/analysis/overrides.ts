/** User What-if overrides persisted on an analysis (isomorphic). */
import { z } from "zod";

import type { Assumptions } from "@/lib/calc/build";
import { BuyerTypeSchema, ExitStrategySchema, PartSourceSchema, RepairLineItemSchema } from "@/lib/domain/schemas";

const money = z.number().int().min(0).max(10_000_000);
const bps = z.number().int().min(0).max(100_000);

export const AssumptionsPatchSchema = z
  .object({
    laborRate: money,
    paintMaterialsPerHour: money,
    partsDiscountBps: bps,
    rebuiltFactorBps: bps,
    targetProfitBps: bps,
    targetProfitMin: money,
    transportCentsPerMile: money,
    transportMin: money,
    titleRegInspection: money,
    storageDays: z.number().int().min(0).max(365),
    storagePerDay: money,
    holdingCostPerDay: money,
    sellingCostBps: bps,
    sellingCostFixed: money,
    salesTaxBps: bps,
    brokerFee: money,
    bidIncrement: z.number().int().min(1).max(1000),
    exitStrategy: ExitStrategySchema,
    buyerType: BuyerTypeSchema,
    partsSourcePreference: PartSourceSchema,
    contingencyOverrideBps: bps.nullable(),
    holdingDaysExpected: z.number().int().min(0).max(365),
    vatRecoverable: z.boolean(),
    mvCleanOverride: money.nullable(),
    distanceOverride: z.number().int().min(0).max(20000).nullable(),
    currentBidOverride: money.nullable(),
    destinationResaleOverride: money.nullable(),
  })
  .partial();

export const UserOverridesSchema = z.object({
  assumptions: AssumptionsPatchSchema.default({}),
  lineItems: z.array(RepairLineItemSchema).max(200).nullable().default(null),
});
export type UserOverrides = z.infer<typeof UserOverridesSchema>;

export function applyAssumptionPatch(base: Assumptions, patch: z.infer<typeof AssumptionsPatchSchema> | undefined): Assumptions {
  if (!patch) return base;
  const out: Assumptions = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) (out as unknown as Record<string, unknown>)[k] = v;
  }
  return out;
}
