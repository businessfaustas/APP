/**
 * Turns the three answers of the one-time setup into the settings they imply (isomorphic, no I/O): where the buyer resells,
 * whether they have a VAT number, and whether they buy at the auctions with their own licence. The settings page can change
 * every one of these afterwards; this only picks the starting point so a report is not built on US defaults for someone abroad.
 */
import type { BuyerType, ExitStrategy } from "@/lib/domain/schemas";
import { isExportCountry, type ExportCountry } from "@/lib/geo/countries";

/** What a rebuilt car sells for next to an undamaged one, for the US market (a branded-title discount). */
export const US_REBUILT_FACTOR_BPS = 7000;
/** The same for a repaired US import resold in Europe: there is no US-style title brand, only the accident history and the import. A starting assumption to check against real sales. */
export const EXPORT_REBUILT_FACTOR_BPS = 8000;
export const BROKER_FEE_MAX = 5000;

export type SetupResale = { kind: "US"; homeZip: string } | { kind: "EXPORT"; country: ExportCountry };

export interface SetupAnswers {
  resale: SetupResale;
  /** Only asked for an export; ignored for a US resale. */
  hasVatNumber: boolean;
  /** Buys at Copart / IAA with their own licence (true) or through a broker (false). */
  hasLicence: boolean;
  /** The broker's fee per car in dollars; only used without a licence. */
  brokerFee?: number;
}

export interface DerivedSettings {
  exitStrategy: ExitStrategy;
  exportProfileId: string | null;
  vatRecoverable: boolean;
  buyerType: BuyerType;
  rebuiltFactorBps: number;
  brokerFee: number;
  homeZip?: string;
}

export function deriveSettings(a: SetupAnswers, profiles: readonly { id: string; countryCode: string }[]): DerivedSettings | { error: "noProfile" } {
  const buyer = {
    buyerType: (a.hasLicence ? "LICENSED_DEALER" : "PUBLIC_VIA_BROKER") as BuyerType,
    brokerFee: a.hasLicence ? 0 : Math.min(BROKER_FEE_MAX, Math.max(0, Math.round(a.brokerFee ?? 0))),
  };
  if (a.resale.kind === "US") {
    return {
      exitStrategy: "RETAIL_REBUILT",
      exportProfileId: null,
      vatRecoverable: false,
      rebuiltFactorBps: US_REBUILT_FACTOR_BPS,
      homeZip: a.resale.homeZip,
      ...buyer,
    };
  }
  const country = a.resale.country;
  const profile = profiles.find((p) => p.countryCode === country);
  if (!profile) return { error: "noProfile" };
  return {
    exitStrategy: "EXPORT",
    exportProfileId: profile.id,
    vatRecoverable: a.hasVatNumber,
    rebuiltFactorBps: EXPORT_REBUILT_FACTOR_BPS,
    ...buyer,
  };
}

/** The resale answer to preselect from the country given at sign-up; null when we can't guess (or can't price an export there). */
export function suggestedResale(country: string | null | undefined): "US" | ExportCountry | null {
  if (country === "US") return "US";
  return isExportCountry(country) ? country : null;
}
