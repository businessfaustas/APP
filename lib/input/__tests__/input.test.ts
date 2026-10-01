import { describe, expect, it } from "vitest";

import { interpretDamageText } from "@/lib/domain/damageZones";
import { normalizeOdometerBrand, normalizeRunCondition, normalizeSaleStatus, normalizeTitle, parseMoney, parseOdometer } from "@/lib/domain/titles";
import { classifyVehicle } from "@/lib/domain/vehicleClass";

import { findVinInText, parseInput } from "../parseInput";
import { detectAuctionUrl, looksLikeUrl } from "../urls";
import { computeCheckDigit, isCheckDigitValid, isVinFormat, modelYearCandidates, normalizeVin, withCheckDigit } from "../vin";

describe("VIN", () => {
  it("validates known-good check digits", () => {
    expect(isCheckDigitValid("1M8GDM9AXKP042788")).toBe(true); // classic NHTSA example
    expect(isCheckDigitValid("11111111111111111")).toBe(true);
    expect(isCheckDigitValid("1M8GDM9A1KP042788")).toBe(false);
  });
  it("rejects I, O and Q", () => {
    expect(isVinFormat("1M8GDM9AXKP04278O")).toBe(false);
    expect(isVinFormat("1M8GDM9AXKP042788")).toBe(true);
  });
  it("builds synthetic VINs with a valid check digit", () => {
    const v = withCheckDigit("WAUAUGFF0K1012345");
    expect(isCheckDigitValid(v)).toBe(true);
    expect(computeCheckDigit(v)).toBe(v[8]);
  });
  it("normalizes and reads the model year", () => {
    expect(normalizeVin(" waua-ugff 0k1012345 ")).toBe("WAUAUGFF0K1012345");
    expect(modelYearCandidates("WAUAUGFF0K1012345")).toContain(2019);
  });
});

describe("URL detection", () => {
  it.each([
    ["https://www.copart.com/lot/90000001/clean-title-2019-audi-a3", "COPART", "90000001"],
    ["copart.com/lot/12345678", "COPART", "12345678"],
    ["https://www.iaai.com/VehicleDetail/39876543~US", "IAAI", "39876543"],
    ["https://www.iaai.com/Vehicle?itemID=39876543&RowNumber=0", "IAAI", "39876543"],
    ["https://bid.cars/en/lot/1-90000003/2020-Ford-F-150", "BIDCARS", "1-90000003"],
    ["https://www.autobidmaster.com/en/carfinder-online-auto-auctions/lot/45678912/", "AUTOBIDMASTER", "45678912"],
    ["https://abetter.bid/en/lot/45678912", "OTHER", "45678912"],
    ["https://example.com/cars/lot-1234567", "OTHER", "1234567"],
  ])("%s → %s %s", (url, source, lot) => {
    const d = detectAuctionUrl(url);
    expect(d?.source).toBe(source);
    expect(d?.lotNumber).toBe(lot);
  });
  it("looksLikeUrl", () => {
    expect(looksLikeUrl("https://x.com")).toBe(true);
    expect(looksLikeUrl("copart.com/lot/1")).toBe(true);
    expect(looksLikeUrl("2019 Audi A3 front damage")).toBe(false);
  });
});

describe("parseInput", () => {
  it("detects URLs", () => {
    const p = parseInput("https://www.copart.com/lot/90000001");
    expect(p.type).toBe("URL");
    if (p.type === "URL") expect(p.label).toBe("Copart lot 90000001 detected");
  });
  it("detects VINs and warns on a bad check digit", () => {
    const ok = parseInput("1M8GDM9AXKP042788");
    expect(ok.type).toBe("VIN");
    expect(ok.warnings).toHaveLength(0);
    const bad = parseInput("1M8GDM9A1KP042788");
    expect(bad.type).toBe("VIN");
    expect(bad.warnings).toHaveLength(1);
  });
  it("treats long text as listing text and finds the VIN", () => {
    const p = parseInput("2019 AUDI A3 PREMIUM\nVIN: 1M8GDM9AXKP042788\nPrimary damage: FRONT END\nOdometer 61,200 mi");
    expect(p.type).toBe("TEXT");
    if (p.type === "TEXT") expect(p.vin).toBe("1M8GDM9AXKP042788");
    expect(findVinInText("no vin here at all, just words")).toBeNull();
  });
  it("rejects short junk", () => {
    expect(parseInput("hello").type).toBe("INVALID");
    expect(parseInput("   ").type).toBe("INVALID");
  });
});

describe("normalizers", () => {
  it("titles", () => {
    expect(normalizeTitle("SALVAGE CERTIFICATE (TX)")).toBe("SALVAGE");
    expect(normalizeTitle("CERT OF TITLE-SALVAGE")).toBe("SALVAGE");
    expect(normalizeTitle("REBUILT/RECONSTRUCTED")).toBe("REBUILT");
    expect(normalizeTitle("CERTIFICATE OF DESTRUCTION")).toBe("NON_REPAIRABLE");
    expect(normalizeTitle("NON-REPAIRABLE")).toBe("NON_REPAIRABLE");
    expect(normalizeTitle("BILL OF SALE - PARTS ONLY")).toBe("PARTS_ONLY");
    expect(normalizeTitle("CLEAN TITLE")).toBe("CLEAN");
    expect(normalizeTitle("WATER DAMAGE")).toBe("FLOOD");
    expect(normalizeTitle("ZZZ")).toBeNull();
    expect(normalizeTitle(null)).toBeNull();
  });
  it("run condition, odometer brand, sale status", () => {
    expect(normalizeRunCondition("Run and Drive")).toBe("RUNS_AND_DRIVES");
    expect(normalizeRunCondition("Engine Start Program")).toBe("STARTS");
    expect(normalizeRunCondition("Stationary")).toBe("WONT_START");
    expect(normalizeRunCondition(undefined)).toBe("UNKNOWN");
    expect(normalizeOdometerBrand("61,200 mi (ACTUAL)")).toBe("ACTUAL");
    expect(normalizeOdometerBrand("NOT ACTUAL")).toBe("NOT_ACTUAL");
    expect(normalizeOdometerBrand("EXEMPT")).toBe("EXEMPT");
    expect(normalizeSaleStatus("On Approval")).toBe("ON_APPROVAL");
    expect(normalizeSaleStatus("Pure Sale")).toBe("PURE_SALE");
  });
  it("money and odometer parsing", () => {
    expect(parseMoney("$12,345 USD")).toBe(12345);
    expect(parseMoney("n/a")).toBeNull();
    expect(parseOdometer("61,200 mi (Actual)")).toBe(61200);
  });
  it("vehicle class", () => {
    expect(classifyVehicle({ make: "Audi", model: "A3" })).toBe("premium");
    expect(classifyVehicle({ make: "Tesla", model: "Model 3" })).toBe("ev");
    expect(classifyVehicle({ make: "Ford", model: "F-150" })).toBe("truck_suv");
    expect(classifyVehicle({ make: "Toyota", model: "Camry" })).toBe("mainstream");
    expect(classifyVehicle({ make: "Kia", model: "Rio" })).toBe("economy");
    expect(classifyVehicle({ make: "Porsche", model: "Macan" })).toBe("luxury");
    expect(classifyVehicle({ make: "Chevrolet", model: "Bolt", fuelType: "Electric" })).toBe("ev");
  });
  it("damage text", () => {
    expect(interpretDamageText("FRONT END").zones).toEqual(["front"]);
    expect(interpretDamageText("WATER/FLOOD").flags).toContain("FLOOD");
    expect(interpretDamageText("LEFT SIDE").zones).toEqual(["left_side"]);
    expect(interpretDamageText("REAR END").zones).toEqual(["rear"]);
    expect(interpretDamageText("ALL OVER").zones.length).toBe(5);
  });
});
