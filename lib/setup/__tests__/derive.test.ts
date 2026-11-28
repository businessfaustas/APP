import { describe, expect, it } from "vitest";

import { BROKER_FEE_MAX, deriveSettings, EXPORT_REBUILT_FACTOR_BPS, suggestedResale, US_REBUILT_FACTOR_BPS } from "../derive";

const profiles = [
  { id: "p-lt", countryCode: "LT" },
  { id: "p-de", countryCode: "DE" },
];

describe("the one-time setup", () => {
  it("sets up an export from Lithuania for a VAT-registered buyer with a broker", () => {
    expect(deriveSettings({ resale: { kind: "EXPORT", country: "LT" }, hasVatNumber: true, hasLicence: false, brokerFee: 450 }, profiles)).toEqual({
      exitStrategy: "EXPORT",
      exportProfileId: "p-lt",
      vatRecoverable: true,
      rebuiltFactorBps: EXPORT_REBUILT_FACTOR_BPS,
      buyerType: "PUBLIC_VIA_BROKER",
      brokerFee: 450,
    });
  });

  it("makes import VAT a cost for an exporter without a VAT number", () => {
    const d = deriveSettings({ resale: { kind: "EXPORT", country: "DE" }, hasVatNumber: false, hasLicence: true }, profiles);
    expect(d).toMatchObject({ exportProfileId: "p-de", vatRecoverable: false, buyerType: "LICENSED_DEALER", brokerFee: 0 });
  });

  it("keeps a US reseller on US retail with their ZIP, and ignores a VAT number that has no meaning there", () => {
    expect(deriveSettings({ resale: { kind: "US", homeZip: "60601" }, hasVatNumber: true, hasLicence: true }, profiles)).toEqual({
      exitStrategy: "RETAIL_REBUILT",
      exportProfileId: null,
      vatRecoverable: false,
      rebuiltFactorBps: US_REBUILT_FACTOR_BPS,
      homeZip: "60601",
      buyerType: "LICENSED_DEALER",
      brokerFee: 0,
    });
  });

  it("refuses an export to a country that has no profile rather than pricing it with the wrong one", () => {
    expect(deriveSettings({ resale: { kind: "EXPORT", country: "PL" }, hasVatNumber: false, hasLicence: true }, profiles)).toEqual({ error: "noProfile" });
  });

  it("keeps the broker fee within bounds and ignores it for someone with a licence", () => {
    const base = { resale: { kind: "US" as const, homeZip: "77002" }, hasVatNumber: false };
    expect(deriveSettings({ ...base, hasLicence: false, brokerFee: 999_999 }, profiles)).toMatchObject({ brokerFee: BROKER_FEE_MAX });
    expect(deriveSettings({ ...base, hasLicence: false, brokerFee: -5 }, profiles)).toMatchObject({ brokerFee: 0 });
    expect(deriveSettings({ ...base, hasLicence: false, brokerFee: 300.6 }, profiles)).toMatchObject({ brokerFee: 301 });
    expect(deriveSettings({ ...base, hasLicence: true, brokerFee: 300 }, profiles)).toMatchObject({ brokerFee: 0 });
  });

  it("preselects the answer from the country given at sign-up", () => {
    expect(suggestedResale("US")).toBe("US");
    expect(suggestedResale("LV")).toBe("LV");
    expect(suggestedResale("FR")).toBeNull();
    expect(suggestedResale(null)).toBeNull();
  });
});
