import "server-only";

import { env } from "@/lib/config/env";
import type { HistoryReport } from "@/lib/domain/schemas";

import { fetchJson } from "../http";

type Json = Record<string, unknown>;

function arr(v: unknown): Json[] {
  return Array.isArray(v) ? (v.filter((x) => x && typeof x === "object") as Json[]) : [];
}
function s(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : typeof v === "number" ? String(v) : null;
}
function n(v: unknown): number | null {
  const x = typeof v === "number" ? v : typeof v === "string" ? Number(v.replace(/[^\d.]/g, "")) : NaN;
  return Number.isFinite(x) ? Math.round(x) : null;
}

/** Maps a VinAudit (NMVTIS) history JSON response defensively — unknown shapes yield empty lists. */
export function mapVinAuditHistory(json: Json): HistoryReport {
  const titles = arr(json.titles ?? json.title_records);
  const jsi = arr(json.jsi ?? json.junk_salvage ?? json.insurance_records);
  const thefts = arr(json.thefts ?? json.theft_records);
  const brands = arr(json.brands ?? json.title_brands);
  const titleRecords = [
    ...titles.map((t) => ({ date: s(t.date), state: s(t.state), brand: s(t.brand) ?? s(t.title_type) ?? "TITLE" })),
    ...brands.map((b) => ({ date: s(b.date), state: s(b.state), brand: s(b.name) ?? s(b.brand) ?? s(b.code) ?? "BRAND" })),
  ];
  const odometerRecords = titles
    .map((t) => ({ date: s(t.date), reading: n(t.meter ?? t.odometer) }))
    .filter((r): r is { date: string | null; reading: number } => r.reading !== null && r.reading > 0);
  const junkSalvageRecords = jsi.map((j) => ({
    date: s(j.date),
    reportingEntity: s(j.brander_name) ?? s(j.entity) ?? s(j.reporting_entity) ?? "Unknown entity",
    disposition: s(j.disposition) ?? s(j.record_type),
  }));
  const totalLossEvents = junkSalvageRecords.length;
  return {
    provider: "VinAudit (NMVTIS)",
    isDemo: false,
    titleRecords,
    odometerRecords,
    junkSalvageRecords,
    totalLossEvents,
    theftRecords: thefts.length,
    notes: titleRecords.length === 0 && junkSalvageRecords.length === 0 ? ["The history provider returned no records for this VIN."] : [],
  };
}

export async function vinAuditHistory(vin: string): Promise<HistoryReport> {
  const e = env();
  if (!e.VINAUDIT_API_KEY) throw new Error("VINAUDIT_API_KEY not set");
  const url = new URL(e.VINAUDIT_HISTORY_URL);
  url.searchParams.set("vin", vin);
  url.searchParams.set("key", e.VINAUDIT_API_KEY);
  url.searchParams.set("format", "json");
  const json = await fetchJson<Json>(url.toString(), { timeoutMs: 20000 });
  if (json.success === false) throw new Error(`VinAudit error: ${s(json.error) ?? "unknown"}`);
  return mapVinAuditHistory(json);
}
