import { describe, expect, it } from "vitest";

import { countryName, countryOptions, EXPORT_COUNTRIES, isExportCountry, normalizeCountry } from "../countries";

describe("countries", () => {
  it("accepts an ISO code in any case and nothing else", () => {
    expect(normalizeCountry("lt")).toBe("LT");
    expect(normalizeCountry(" US ")).toBe("US");
    for (const bad of ["Lithuania", "LTU", "XX", "", null, undefined, 7, {}]) expect(normalizeCountry(bad)).toBeNull();
  });

  it("names a country in the language of the page", () => {
    expect(countryName("LT", "en")).toBe("Lithuania");
    expect(countryName("LT", "lt")).toBe("Lietuva");
    expect(countryName("DE", "lt")).toBe("Vokietija");
  });

  it("lists the USA and the export countries first, then everything else A to Z, with no duplicates", () => {
    const { featured, others } = countryOptions("en");
    expect(featured.map((c) => c.code)).toEqual(["US", ...EXPORT_COUNTRIES]);
    const all = [...featured, ...others].map((c) => c.code);
    expect(new Set(all).size).toBe(all.length);
    expect(others.length).toBeGreaterThan(200);
    const names = others.map((c) => c.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "en")));
  });

  it("knows which countries it can price an export to", () => {
    expect(isExportCountry("LV")).toBe(true);
    expect(isExportCountry("US")).toBe(false);
    expect(isExportCountry(null)).toBe(false);
  });
});
