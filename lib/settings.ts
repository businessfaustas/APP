import "server-only";

import type { ExportProfileData, SettingsLike } from "@/lib/calc/build";
import type { FeeSchedule, FeeTier } from "@/lib/calc/types";
import { placeholderFeeSchedule } from "@/lib/calc/placeholderFees";
import { prisma } from "@/lib/db/prisma";
import type { AuctionSource, BuyerType } from "@/lib/domain/schemas";
import type { UserSettings } from "@/lib/generated/prisma/client";

export interface SettingsSnapshot extends SettingsLike {
  listToSaleBps: number;
  homeZip: string;
  currency: string;
  exportProfileId: string | null;
}

export function toSnapshot(s: UserSettings): SettingsSnapshot {
  return {
    listToSaleBps: s.listToSaleBps,
    homeZip: s.homeZip,
    currency: s.currency,
    exportProfileId: s.exportProfileId,
    buyerType: s.buyerType,
    laborRate: s.laborRate,
    paintMaterialsPerHour: s.paintMaterialsPerHour,
    partsSourcePreference: s.partsSourcePreference,
    partsDiscountBps: s.partsDiscountBps,
    rebuiltFactorBps: s.rebuiltFactorBps,
    targetProfitBps: s.targetProfitBps,
    targetProfitMin: s.targetProfitMin,
    transportCentsPerMile: s.transportCentsPerMile,
    transportMin: s.transportMin,
    titleRegInspection: s.titleRegInspection,
    storageDays: s.storageDays,
    storagePerDay: s.storagePerDay,
    holdingCostPerDay: s.holdingCostPerDay,
    holdingDaysExpected: s.holdingDaysExpected,
    sellingCostBps: s.sellingCostBps,
    sellingCostFixed: s.sellingCostFixed,
    salesTaxBps: s.salesTaxBps,
    brokerFee: s.brokerFee,
    contingencyOverrideBps: s.contingencyOverrideBps,
    exitStrategy: s.exitStrategy,
    vatRecoverable: s.vatRecoverable,
  };
}

export async function loadSettings(userId: string): Promise<{ row: UserSettings; snapshot: SettingsSnapshot; listToSaleBps: number }> {
  const row = (await prisma.userSettings.findUnique({ where: { userId } })) ?? (await prisma.userSettings.create({ data: { userId } }));
  return { row, snapshot: toSnapshot(row), listToSaleBps: row.listToSaleBps };
}

/** Which fee schedule family applies to a listing source (broker sites resell Copart/IAAI lots). */
export function feeSourceFor(source: AuctionSource): "COPART" | "IAAI" {
  return source === "IAAI" ? "IAAI" : "COPART";
}

function rowToSchedule(r: {
  id: string;
  source: AuctionSource;
  buyerType: BuyerType;
  name: string;
  buyerFeeTiers: unknown;
  onlineBidFeeTiers: unknown;
  fixedFees: unknown;
  isPlaceholder: boolean;
  verifiedAt: Date | null;
  sourceUrl: string | null;
}): FeeSchedule {
  return {
    id: r.id,
    source: r.source,
    buyerType: r.buyerType,
    name: r.name,
    buyerFeeTiers: r.buyerFeeTiers as FeeTier[],
    onlineBidFeeTiers: r.onlineBidFeeTiers as FeeTier[],
    fixedFees: r.fixedFees as { label: string; amount: number }[],
    isPlaceholder: r.isPlaceholder,
    verifiedAt: r.verifiedAt?.toISOString() ?? null,
    sourceUrl: r.sourceUrl,
  };
}

export async function loadFeeSchedules(source: AuctionSource): Promise<Record<BuyerType, FeeSchedule>> {
  const family = feeSourceFor(source);
  const rows = await prisma.feeSchedule.findMany({ where: { source: family, active: true }, orderBy: { updatedAt: "desc" } });
  const pick = (bt: BuyerType) => {
    const r = rows.find((x) => x.buyerType === bt);
    return r ? rowToSchedule(r) : placeholderFeeSchedule(family, bt);
  };
  return { LICENSED_DEALER: pick("LICENSED_DEALER"), PUBLIC_VIA_BROKER: pick("PUBLIC_VIA_BROKER") };
}

export async function loadExportProfile(id: string | null): Promise<ExportProfileData | null> {
  if (!id) return null;
  const p = await prisma.exportProfile.findUnique({ where: { id } });
  return p;
}
