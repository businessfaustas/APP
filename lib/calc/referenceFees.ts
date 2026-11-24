import { copartCrashedToysLicensedFees } from "./copartFees";
import type { ReferenceFees } from "./feeTables";
import { iaaFees } from "./iaaFees";

/**
 * The published fee tables we have for a given auction and buyer type, or null where we only have the placeholder.
 *  - Copart, licensed: the CrashedToys Preferred Pricing table (checked against the page by the owner, still flagged).
 *  - IAAI, licensed and non-licensed: IAA's standard schedule (typed in from IAA's fee pages, not yet verified).
 * The seed loads these outside demo mode, into a schedule that still holds the untouched placeholder.
 */
export function referenceFees(source: string, buyerType: string): ReferenceFees | null {
  if (source === "COPART" && buyerType === "LICENSED_DEALER") return copartCrashedToysLicensedFees();
  if (source === "IAAI" && buyerType === "LICENSED_DEALER") return iaaFees({ licensed: true });
  if (source === "IAAI" && buyerType === "PUBLIC_VIA_BROKER") return iaaFees({ licensed: false });
  return null;
}
