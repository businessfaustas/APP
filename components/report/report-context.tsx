"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { toast } from "sonner";

import { applyAssumptionPatch, type UserOverrides } from "@/lib/analysis/overrides";
import type { AnalysisView } from "@/lib/analysis/view";
import { assumptionsFromSettings, runAnalysisCalc, type Assumptions } from "@/lib/calc/build";
import type { CalculationResult } from "@/lib/calc/types";
import type { RepairLineItem } from "@/lib/domain/schemas";

interface ReportState {
  view: AnalysisView;
  assumptions: Assumptions;
  defaults: Assumptions;
  lineItems: RepairLineItem[];
  calc: CalculationResult | null;
  dirty: boolean;
  saving: boolean;
  marketMissing: boolean;
  setAssumption: <K extends keyof Assumptions>(key: K, value: Assumptions[K]) => void;
  updateLine: (id: string, patch: Partial<RepairLineItem>) => void;
  addLine: (line: RepairLineItem) => void;
  removeLine: (id: string) => void;
  reset: () => void;
  save: () => Promise<void>;
  saveDefaults: () => Promise<void>;
}

const Ctx = createContext<ReportState | null>(null);

export function useReport(): ReportState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useReport must be used inside <ReportProvider>");
  return v;
}

/** Keys that differ from the defaults (what gets saved as report overrides). */
function diffAssumptions(a: Assumptions, d: Assumptions): Partial<Assumptions> {
  const out: Partial<Assumptions> = {};
  for (const k of Object.keys(a) as (keyof Assumptions)[]) {
    if (a[k] !== d[k]) (out as Record<string, unknown>)[k] = a[k];
  }
  return out;
}

const SETTINGS_KEYS = [
  "buyerType",
  "laborRate",
  "paintMaterialsPerHour",
  "partsSourcePreference",
  "partsDiscountBps",
  "rebuiltFactorBps",
  "targetProfitBps",
  "targetProfitMin",
  "transportCentsPerMile",
  "transportMin",
  "titleRegInspection",
  "storageDays",
  "storagePerDay",
  "holdingCostPerDay",
  "holdingDaysExpected",
  "sellingCostBps",
  "sellingCostFixed",
  "salesTaxBps",
  "brokerFee",
  "contingencyOverrideBps",
  "exitStrategy",
  "vatRecoverable",
] as const;

export function ReportProvider({ view, children }: { view: AnalysisView; children: React.ReactNode }) {
  const [defaults, setDefaults] = useState(() => assumptionsFromSettings(view.settings));
  const [saved, setSaved] = useState<UserOverrides>(view.overrides);
  const originalLines = useMemo(() => view.repair?.lineItems ?? [], [view.repair]);
  const [assumptions, setAssumptions] = useState(() => applyAssumptionPatch(defaults, view.overrides.assumptions));
  const [lineItems, setLineItems] = useState<RepairLineItem[]>(() => view.overrides.lineItems ?? originalLines);
  const [saving, setSaving] = useState(false);

  const marketMissing = view.market?.provider === "NONE" && assumptions.mvCleanOverride === null;

  const calc = useMemo(() => {
    if (!view.base) return null;
    return runAnalysisCalc({ ...view.base, lineItems }, assumptions);
  }, [view.base, lineItems, assumptions]);

  const savedAssumptions = useMemo(() => applyAssumptionPatch(defaults, saved.assumptions), [defaults, saved.assumptions]);
  const savedLines = saved.lineItems ?? originalLines;
  const dirty = JSON.stringify(assumptions) !== JSON.stringify(savedAssumptions) || JSON.stringify(lineItems) !== JSON.stringify(savedLines);

  const setAssumption = useCallback(<K extends keyof Assumptions>(key: K, value: Assumptions[K]) => {
    setAssumptions((a) => ({ ...a, [key]: value }));
  }, []);

  const updateLine = useCallback((id: string, patch: Partial<RepairLineItem>) => {
    setLineItems((items) => items.map((l) => (l.id === id ? { ...l, ...patch, userEdited: true } : l)));
  }, []);
  const addLine = useCallback((line: RepairLineItem) => setLineItems((items) => [...items, line]), []);
  const removeLine = useCallback((id: string) => setLineItems((items) => items.filter((l) => l.id !== id)), []);

  const reset = useCallback(() => {
    setAssumptions(defaults);
    setLineItems(originalLines);
  }, [defaults, originalLines]);

  const save = useCallback(async () => {
    setSaving(true);
    const body: UserOverrides = {
      assumptions: diffAssumptions(assumptions, defaults),
      lineItems: JSON.stringify(lineItems) === JSON.stringify(originalLines) ? null : lineItems,
    };
    try {
      const res = await fetch(`/api/analyses/${view.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userOverrides: body }),
      });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Save failed");
      setSaved(body);
      toast.success("Saved to this report");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [assumptions, defaults, lineItems, originalLines, view.id]);

  const saveDefaults = useCallback(async () => {
    setSaving(true);
    const patch: Record<string, unknown> = {};
    for (const k of SETTINGS_KEYS) patch[k] = assumptions[k];
    try {
      const res = await fetch("/api/settings", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Save failed");
      const nextDefaults: Assumptions = { ...defaults };
      for (const k of SETTINGS_KEYS) (nextDefaults as unknown as Record<string, unknown>)[k] = assumptions[k];
      setDefaults(nextDefaults);
      toast.success("Saved as your defaults for future reports");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [assumptions, defaults]);

  const value: ReportState = {
    view,
    assumptions,
    defaults,
    lineItems,
    calc,
    dirty,
    saving,
    marketMissing,
    setAssumption,
    updateLine,
    addLine,
    removeLine,
    reset,
    save,
    saveDefaults,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
