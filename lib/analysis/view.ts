import "server-only";

import type { AnalysisBase } from "@/lib/calc/build";
import type { CalculationResult } from "@/lib/calc/types";
import { prisma } from "@/lib/db/prisma";
import type {
  DamageAssessment,
  DataSources,
  HistoryReport,
  LogisticsInfo,
  MarketValuation,
  NormalizedListing,
  RepairEstimate,
  RiskFlag,
  VehicleInfo,
} from "@/lib/domain/schemas";
import { InputPayloadSchema, STEP_LABELS, type ManualListing } from "@/lib/pipeline/types";
import type { SettingsSnapshot } from "@/lib/settings";

import { UserOverridesSchema, type UserOverrides } from "./overrides";

export interface PhotoView {
  id: string;
  position: number;
  url: string;
}

function prefillFrom(raw: unknown): ManualListing | null {
  const p = InputPayloadSchema.safeParse(raw);
  if (!p.success || (!p.data.hints && !p.data.manual)) return null;
  const merged: ManualListing = { ...(p.data.hints ?? {}) };
  for (const [k, v] of Object.entries(p.data.manual ?? {})) if (v !== null && v !== undefined && v !== "") (merged as Record<string, unknown>)[k] = v;
  return merged;
}

/** Everything the report UI needs, JSON-serializable. */
export interface AnalysisView {
  id: string;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";
  progress: number;
  currentStep: string | null;
  stepLabel: string;
  needsInput: boolean;
  /** Details already known when the analysis is waiting for input (from the link and earlier entries). */
  inputPrefill: ManualListing | null;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
  inputType: string;
  inputValue: string;
  listing: NormalizedListing | null;
  vehicle: VehicleInfo | null;
  history: HistoryReport | null;
  damage: DamageAssessment | null;
  damageFromPhotos: boolean;
  repair: RepairEstimate | null;
  market: MarketValuation | null;
  logistics: LogisticsInfo | null;
  base: AnalysisBase | null;
  calc: CalculationResult | null;
  flags: RiskFlag[];
  checklist: string[];
  narrative: string | null;
  settings: SettingsSnapshot;
  overrides: UserOverrides;
  dataSources: DataSources;
  photos: PhotoView[];
  shareToken: string | null;
  watchlisted: boolean;
  isDemo: boolean;
  aiCostUsd: number | null;
  readOnly: boolean;
}

export async function getAnalysisView(id: string, access: { userId: string } | { shareToken: string }): Promise<AnalysisView | null> {
  const where = "userId" in access ? { id, userId: access.userId } : { shareToken: access.shareToken };
  const a = await prisma.analysis.findFirst({
    where,
    include: { listing: { include: { photos: { orderBy: { position: "asc" } } } } },
  });
  if (!a) return null;
  const shared = "shareToken" in access;
  const watch =
    !shared && a.listingId ? await prisma.watchlistItem.findUnique({ where: { userId_listingId: { userId: access.userId, listingId: a.listingId } } }) : null;
  const sources = (a.dataSources as DataSources | null) ?? {};
  const photos: PhotoView[] = (a.listing?.photos ?? [])
    .map((p) => ({
      id: p.id,
      position: p.position,
      url: p.originalUrl?.startsWith("/demo-photos/") ? p.originalUrl : p.storagePath ? `/api/photos/${p.id}` : "",
    }))
    .filter((p) => p.url && (!shared || p.url.startsWith("/demo-photos/")));
  const overrides = UserOverridesSchema.safeParse(a.userOverrides ?? {});
  const step = a.currentStep ?? a.status;
  return {
    id: a.id,
    status: a.status,
    progress: a.progress,
    currentStep: a.currentStep,
    stepLabel: STEP_LABELS[step] ?? step,
    needsInput: a.currentStep === "NEEDS_INPUT",
    inputPrefill: prefillFrom(a.inputPayload),
    error: a.error,
    createdAt: a.createdAt.toISOString(),
    completedAt: a.completedAt?.toISOString() ?? null,
    inputType: a.inputType,
    inputValue: a.inputValue,
    listing: (a.listingSnapshot as NormalizedListing | null) ?? null,
    vehicle: (a.vehicleInfo as VehicleInfo | null) ?? null,
    history: (a.history as HistoryReport | null) ?? null,
    damage: (a.damage as DamageAssessment | null) ?? null,
    damageFromPhotos: a.damageFromPhotos,
    repair: (a.repairEstimate as RepairEstimate | null) ?? null,
    market: (a.market as MarketValuation | null) ?? null,
    logistics: (a.logistics as LogisticsInfo | null) ?? null,
    base: (a.calcInput as AnalysisBase | null) ?? null,
    calc: (a.calc as CalculationResult | null) ?? null,
    flags: (a.flags as RiskFlag[] | null) ?? [],
    checklist: (a.checklist as string[] | null) ?? [],
    narrative: a.narrative,
    settings: a.settingsSnapshot as unknown as SettingsSnapshot,
    overrides: overrides.success ? overrides.data : { assumptions: {}, lineItems: null },
    dataSources: sources,
    photos,
    shareToken: shared ? null : a.shareToken,
    watchlisted: Boolean(watch),
    isDemo: Object.values(sources).some((s) => s.isDemo),
    aiCostUsd: a.aiCostUsd,
    readOnly: shared,
  };
}
