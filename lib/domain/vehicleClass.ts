import type { VehicleClass } from "./schemas";

/** Editable brand → class mapping (checked after EV and truck/SUV rules). */
export const BRAND_CLASS: Record<string, VehicleClass> = {
  PORSCHE: "luxury",
  "LAND ROVER": "luxury",
  MASERATI: "luxury",
  BENTLEY: "luxury",
  "ROLLS-ROYCE": "luxury",
  LAMBORGHINI: "luxury",
  FERRARI: "luxury",
  "ASTON MARTIN": "luxury",
  MCLAREN: "luxury",
  AUDI: "premium",
  BMW: "premium",
  "MERCEDES-BENZ": "premium",
  MERCEDES: "premium",
  LEXUS: "premium",
  ACURA: "premium",
  INFINITI: "premium",
  VOLVO: "premium",
  GENESIS: "premium",
  LINCOLN: "premium",
  CADILLAC: "premium",
  JAGUAR: "premium",
  "ALFA ROMEO": "premium",
  MITSUBISHI: "economy",
  FIAT: "economy",
};

const ECONOMY_MODELS = /^(RIO|FORTE|SOUL|ACCENT|ELANTRA|VENUE|VERSA|SENTRA|KICKS|SPARK|SONIC|TRAX|MIRAGE|YARIS|FIT)\b/i;
const TRUCK_SUV_MODELS =
  /\b(F-?150|F-?250|F-?350|SILVERADO|SIERRA|RAM|TUNDRA|TACOMA|TITAN|FRONTIER|COLORADO|CANYON|RANGER|GLADIATOR|TAHOE|SUBURBAN|YUKON|ESCALADE|EXPEDITION|NAVIGATOR|SEQUOIA|ARMADA|4RUNNER|LAND CRUISER)\b/i;

export function classifyVehicle(v: { make: string | null; model: string | null; bodyClass?: string | null; fuelType?: string | null }): VehicleClass {
  const fuel = (v.fuelType ?? "").toUpperCase();
  if (/ELECTRIC|BEV|BATTERY/.test(fuel) && !/HYBRID|GASOLINE/.test(fuel)) return "ev";
  const make = (v.make ?? "").toUpperCase().trim();
  if (make === "TESLA" || make === "RIVIAN" || make === "LUCID" || make === "POLESTAR") return "ev";
  const body = (v.bodyClass ?? "").toUpperCase();
  const model = v.model ?? "";
  if (/PICKUP|TRUCK/.test(body) || TRUCK_SUV_MODELS.test(model)) return "truck_suv";
  const brandClass = BRAND_CLASS[make];
  if (brandClass) return brandClass;
  if (ECONOMY_MODELS.test(model)) return "economy";
  return "mainstream";
}

export const VEHICLE_CLASS_LABELS: Record<VehicleClass, string> = {
  economy: "Economy",
  mainstream: "Mainstream",
  premium: "Premium",
  luxury: "Luxury",
  truck_suv: "Truck / large SUV",
  ev: "Electric",
};
