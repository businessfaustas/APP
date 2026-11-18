import type { NormalizedListing, VehicleInfo } from "@/lib/domain/schemas";

/**
 * Everything known about the car that moves its price, one fact per line, for the AI's market
 * research: trim, engine, drive, fuel, transmission, colour, where it is, odometer. Facts the
 * listing and the VIN decode disagree on are given once, listing first (it names the trim).
 * The title brand is left out on purpose: the question is what the car is worth CLEAN.
 */
export function vehicleDetails(
  l: Pick<NormalizedListing, "vin" | "engine" | "transmission" | "drive" | "fuel" | "color" | "odometer" | "odometerUnit" | "odometerBrand" | "location">,
  v: Pick<VehicleInfo, "bodyClass" | "driveType" | "engine" | "fuelType" | "transmission" | "turbo"> | null,
): string {
  const lines: string[] = [];
  const add = (label: string, value: string | null | undefined) => {
    if (value && value.trim()) lines.push(`${label}: ${value.trim()}`);
  };
  add("Body", v?.bodyClass);
  add("Engine", l.engine ?? v?.engine);
  if (v?.turbo) lines.push("Turbocharged: yes");
  add("Drive", l.drive ?? v?.driveType);
  add("Fuel", l.fuel ?? v?.fuelType);
  add("Transmission", l.transmission ?? v?.transmission);
  add("Colour", l.color);
  if (l.odometer !== null)
    add(
      "Odometer",
      `${l.odometer.toLocaleString("en-US")} ${l.odometerUnit}${l.odometerBrand === "ACTUAL" ? "" : ` (${l.odometerBrand.toLowerCase().replace(/_/g, " ")})`}`,
    );
  add("Car is located in", [l.location.city, l.location.state].filter(Boolean).join(", "));
  add("VIN", l.vin);
  return lines.join("\n");
}
