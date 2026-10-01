import "server-only";

import { z } from "zod";

import type { Recall, VehicleInfo } from "@/lib/domain/schemas";
import { classifyVehicle } from "@/lib/domain/vehicleClass";

import { fetchJson } from "../http";

const DecodeResponse = z.object({
  Results: z.array(z.record(z.string(), z.union([z.string(), z.number(), z.null()]))),
});

const RecallsResponse = z.object({
  results: z
    .array(
      z
        .object({
          NHTSACampaignNumber: z.string().optional(),
          Component: z.string().optional(),
          Summary: z.string().optional(),
          Remedy: z.string().optional(),
          ReportReceivedDate: z.string().optional(),
        })
        .passthrough(),
    )
    .default([]),
});

const ComplaintsResponse = z.object({
  results: z.array(z.object({ components: z.string().optional() }).passthrough()).default([]),
});

function val(r: Record<string, string | number | null>, key: string): string | null {
  const v = r[key];
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s && s !== "Not Applicable" && s !== "0" ? s : null;
}

export interface DecodedVin {
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  bodyClass: string | null;
  driveType: string | null;
  engine: string | null;
  fuelType: string | null;
  transmission: string | null;
  turbo: boolean;
  isEv: boolean;
  isHybrid: boolean;
  hasAdas: boolean | null;
  errorText: string | null;
  raw: Record<string, string | number | null>;
}

export async function nhtsaDecode(vin: string): Promise<DecodedVin> {
  const url = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/${encodeURIComponent(vin)}?format=json`;
  const json = DecodeResponse.parse(await fetchJson(url, { timeoutMs: 12000 }));
  const r = json.Results[0] ?? {};
  const displacement = val(r, "DisplacementL");
  const cylinders = val(r, "EngineCylinders");
  const turbo = /yes|turbo/i.test(val(r, "Turbo") ?? "") || /turbo/i.test(val(r, "EngineConfiguration") ?? "");
  const electrification = val(r, "ElectrificationLevel") ?? "";
  const fuel = val(r, "FuelTypePrimary");
  const adasFields = ["AdaptiveCruiseControl", "ForwardCollisionWarning", "LaneDepartureWarning", "CIB", "LaneKeepSystem"].map((k) => val(r, k));
  const hasAdas = adasFields.some((v) => v && /standard|optional/i.test(v)) ? true : adasFields.every((v) => v === null) ? null : false;
  const engine = displacement ? `${Number(displacement).toFixed(1)}L${cylinders ? ` ${cylinders}-cyl` : ""}${turbo ? " Turbo" : ""}` : val(r, "EngineModel");
  const transStyle = val(r, "TransmissionStyle");
  const speeds = val(r, "TransmissionSpeeds");
  return {
    year: val(r, "ModelYear") ? Number(val(r, "ModelYear")) : null,
    make: val(r, "Make"),
    model: val(r, "Model"),
    trim: val(r, "Trim") ?? val(r, "Series"),
    bodyClass: val(r, "BodyClass"),
    driveType: val(r, "DriveType"),
    engine,
    fuelType: fuel,
    transmission: transStyle ? `${speeds ? `${speeds}-speed ` : ""}${transStyle}` : null,
    turbo,
    isEv: /BEV|battery electric/i.test(electrification) || /^electric$/i.test(fuel ?? ""),
    isHybrid: /HEV|hybrid|PHEV/i.test(electrification),
    hasAdas,
    errorText: val(r, "ErrorCode") && val(r, "ErrorCode") !== "0" ? val(r, "ErrorText") : null,
    raw: r,
  };
}

export async function nhtsaRecalls(make: string, model: string, year: number): Promise<Recall[]> {
  const url = `https://api.nhtsa.gov/recalls/recallsByVehicle?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&modelYear=${year}`;
  const json = RecallsResponse.parse(await fetchJson(url, { timeoutMs: 12000 }));
  return json.results.slice(0, 20).map((r) => ({
    campaign: r.NHTSACampaignNumber ?? "—",
    component: r.Component ?? "Unknown component",
    summary: (r.Summary ?? "").slice(0, 600),
    remedy: r.Remedy ? r.Remedy.slice(0, 400) : null,
    reportDate: r.ReportReceivedDate ?? null,
  }));
}

export async function nhtsaComplaints(make: string, model: string, year: number): Promise<{ component: string; count: number }[]> {
  const url = `https://api.nhtsa.gov/complaints/complaintsByVehicle?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&modelYear=${year}`;
  const json = ComplaintsResponse.parse(await fetchJson(url, { timeoutMs: 12000 }));
  const counts = new Map<string, number>();
  for (const c of json.results) {
    for (const comp of (c.components ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)) {
      counts.set(comp, (counts.get(comp) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([component, count]) => ({ component, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

/** Builds VehicleInfo from a decode (may be null) plus listing fallbacks. */
export function buildVehicleInfo(args: {
  vin: string | null;
  decoded: DecodedVin | null;
  listing: {
    year: number | null;
    make: string | null;
    model: string | null;
    trim: string | null;
    engine: string | null;
    fuel: string | null;
    drive: string | null;
    transmission: string | null;
  };
  recalls: Recall[];
  complaints: { component: string; count: number }[];
  decodeSource: string;
}): VehicleInfo {
  const d = args.decoded;
  const l = args.listing;
  const make = d?.make ?? l.make;
  const model = d?.model ?? l.model;
  const fuelType = d?.fuelType ?? l.fuel;
  const year = d?.year ?? l.year;
  const engine = d?.engine ?? l.engine;
  const vehicleClass = classifyVehicle({ make, model, bodyClass: d?.bodyClass ?? null, fuelType });
  const turbo = d?.turbo ?? /turbo|ecoboost|tfsi|\bt\b/i.test(engine ?? "");
  const isEv = d?.isEv ?? (/electric/i.test(fuelType ?? "") && !/hybrid/i.test(fuelType ?? ""));
  return {
    vin: args.vin,
    year,
    make: make ? make.toUpperCase() : null,
    model: model ? model.toUpperCase() : null,
    trim: d?.trim ?? l.trim,
    bodyClass: d?.bodyClass ?? null,
    driveType: d?.driveType ?? l.drive,
    engine,
    fuelType,
    transmission: d?.transmission ?? l.transmission,
    turbo,
    vehicleClass: isEv ? "ev" : vehicleClass,
    isEv,
    isHybrid: d?.isHybrid ?? /hybrid/i.test(fuelType ?? ""),
    hasAdasLikely: d?.hasAdas ?? ((year ?? 0) >= 2018 && vehicleClass !== "economy"),
    decodeSource: args.decodeSource,
    recalls: args.recalls,
    complaints: args.complaints,
  };
}
