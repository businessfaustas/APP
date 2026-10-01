import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { withCheckDigit } from "@/lib/input/vin";

import { extractionScore, heuristicExtract, parseLocation } from "../heuristicExtract";
import { extractFromHtml, parseCopartEmbedded, parseJsonLd } from "../htmlExtract";
import { finalizeListing, hasVehicleIdentity, mergeRaw } from "../normalize";

const fixture = (p: string) => readFileSync(path.join(process.cwd(), "fixtures", p), "utf8");

describe("HTML extraction", () => {
  it("Copart embedded lot JSON", () => {
    const { raw } = extractFromHtml(fixture("html/copart-sample.html"), "COPART", "https://www.copart.com/lot/45678912");
    const l = finalizeListing(raw, "PARSER");
    expect(l.lotNumber).toBe("45678912");
    expect(l.vin).toBe("1HGCV1F34JA012345");
    expect(l.year).toBe(2018);
    expect(l.make).toBe("HONDA");
    expect(l.model).toBe("ACCORD");
    expect(l.odometer).toBe(88412);
    expect(l.odometerBrand).toBe("ACTUAL");
    expect(l.titleCategory).toBe("SALVAGE");
    expect(l.primaryDamage).toBe("FRONT END");
    expect(l.runCondition).toBe("RUNS_AND_DRIVES");
    expect(l.hasKeys).toBe(true);
    expect(l.currentBid).toBe(1850);
    expect(l.listedRetailValue).toBe(19876);
    expect(l.location.state).toBe("TX");
    expect(l.location.zip).toBe("77073");
    expect(l.saleDate).not.toBeNull();
    expect(l.photoUrls.length).toBeGreaterThanOrEqual(3);
    expect(l.photoUrls.some((u) => u.includes("logo"))).toBe(false);
  });

  it("IAAI definition list + JSON-LD", () => {
    const { raw } = extractFromHtml(fixture("html/iaai-sample.html"), "IAAI", "https://www.iaai.com/VehicleDetail/39876543~US");
    const l = finalizeListing(raw, "PARSER");
    expect(l.vin).toBe("1N4BL4BV5LC123456");
    expect(l.make).toBe("NISSAN");
    expect(l.year).toBe(2020);
    expect(l.lotNumber).toBe("39876543");
    expect(l.odometer).toBe(54120);
    expect(l.primaryDamage).toBe("REAR");
    expect(l.titleCategory).toBe("SALVAGE");
    expect(l.titleState).toBe("GA");
    expect(l.runCondition).toBe("RUNS_AND_DRIVES");
    expect(l.hasKeys).toBe(true);
    expect(l.listedRetailValue).toBe(17250);
    expect(l.location.state).toBe("GA");
    expect(l.photoUrls.length).toBe(2);
  });

  it("Bid.cars table", () => {
    const { raw, title } = extractFromHtml(fixture("html/bidcars-sample.html"), "BIDCARS", "https://bid.cars/en/lot/1-34567890");
    const l = finalizeListing(raw, "PARSER");
    expect(title).toMatch(/Jetta/);
    expect(l.vin).toBe("3VWC57BU1KM123456");
    expect(l.odometer).toBe(71900);
    expect(l.year).toBe(2019);
    expect(l.make).toBe("VOLKSWAGEN");
    expect(l.currentBid).toBe(1275);
    expect(l.location.zip).toBe("43207");
    expect(l.location.city).toBe("Columbus");
    expect(l.photoUrls).toHaveLength(1);
  });

  it("tolerates broken embedded JSON and JSON-LD", () => {
    expect(parseCopartEmbedded('cachedSolrLotDetailsJSON = "{not json"')).toBeNull();
    expect(parseCopartEmbedded("<html></html>")).toBeNull();
    expect(parseJsonLd(["{bad", JSON.stringify({ model: "X", brand: "TESLA" })]).make).toBe("TESLA");
  });
});

describe("pasted text extraction", () => {
  it("reads Copart-style label/value lines", () => {
    const vin = withCheckDigit("WAUAUGFF0K1012345");
    const text = fixture("text/copart-pasted.txt").replace("WAUAUGFF?K1012345", vin);
    const raw = heuristicExtract(text);
    const l = finalizeListing({ ...raw, source: "COPART" }, "PARSER");
    expect(l.vin).toBe(vin);
    expect(l.lotNumber).toBe("90000001");
    expect(l.year).toBe(2019);
    expect(l.make).toBe("AUDI");
    expect(l.model).toBe("A3");
    expect(l.odometer).toBe(61200);
    expect(l.titleCategory).toBe("SALVAGE");
    expect(l.primaryDamage).toBe("FRONT END");
    expect(l.runCondition).toBe("RUNS_AND_DRIVES");
    expect(l.hasKeys).toBe(true);
    expect(l.currentBid).toBe(2100);
    expect(l.listedRetailValue).toBe(21450);
    expect(l.location.state).toBe("TX");
    expect(extractionScore(raw)).toBeGreaterThan(0.8);
    expect(hasVehicleIdentity(l)).toBe(true);
  });

  it("parses locations", () => {
    expect(parseLocation("TX - DALLAS SOUTH")).toMatchObject({ state: "TX", city: "DALLAS" });
    expect(parseLocation("Dallas, TX 75236")).toMatchObject({ state: "TX", city: "Dallas", zip: "75236" });
    expect(parseLocation("Somewhere")).toMatchObject({ state: null, city: null });
  });

  it("merge keeps the first non-empty value and unions photos", () => {
    const m = mergeRaw({ make: "A", photoUrls: ["x"] }, { make: "B", model: "M", photoUrls: ["x", "y"] });
    expect(m.make).toBe("A");
    expect(m.model).toBe("M");
    expect(m.photoUrls).toEqual(["x", "y"]);
  });

  it("finalize drops invalid VINs with a warning", () => {
    const l = finalizeListing({ vin: "SHORT" }, "MANUAL");
    expect(l.vin).toBeNull();
    expect(l.warnings[0]).toMatch(/invalid VIN/);
    expect(hasVehicleIdentity(l)).toBe(false);
  });
});
