import type { AuctionSource } from "@/lib/domain/schemas";

import { detectAuctionUrl, looksLikeUrl, sourceLabel } from "./urls";
import { isCheckDigitValid, isVinFormat, normalizeVin } from "./vin";

export type ParsedInput =
  | { type: "URL"; source: AuctionSource; lotNumber: string | null; url: string; label: string; warnings: string[] }
  | { type: "VIN"; vin: string; label: string; warnings: string[] }
  | { type: "TEXT"; text: string; vin: string | null; label: string; warnings: string[] }
  | { type: "INVALID"; label: string; warnings: string[] };

/** Finds a plausible VIN inside free text (used for pasted listings). */
export function findVinInText(text: string): string | null {
  const matches = text.toUpperCase().match(/\b[A-HJ-NPR-Z0-9]{17}\b/g) ?? [];
  const valid = matches.find((m) => /\d/.test(m) && /[A-Z]/.test(m) && isCheckDigitValid(m));
  return valid ?? matches.find((m) => /\d/.test(m) && /[A-Z]/.test(m)) ?? null;
}

/** Classifies what the user pasted: an auction URL, a VIN, or listing text. */
export function parseInput(raw: string): ParsedInput {
  const s = raw.trim();
  if (!s) return { type: "INVALID", label: "Paste a link, a VIN or the listing text", warnings: [] };

  if (looksLikeUrl(s)) {
    const d = detectAuctionUrl(s);
    if (d) {
      const warnings: string[] = [];
      if (!d.lotNumber) warnings.push("Couldn't find a lot number in this link.");
      const label =
        d.source === "OTHER"
          ? `Listing on ${d.host}${d.lotNumber ? ` (lot ${d.lotNumber})` : ""}`
          : `${sourceLabel(d.source)} lot ${d.lotNumber ?? "(unknown)"} detected`;
      return { type: "URL", source: d.source, lotNumber: d.lotNumber, url: d.url, label, warnings };
    }
  }

  const compact = normalizeVin(s);
  if (compact.length === 17 && isVinFormat(compact) && !/\s{2,}/.test(s) && s.length <= 25) {
    const warnings = isCheckDigitValid(compact) ? [] : ["The VIN check digit doesn't match. That's normal for some non-US vehicles — double-check the VIN."];
    return { type: "VIN", vin: compact, label: `VIN ${compact} detected`, warnings };
  }

  if (s.length >= 30) {
    const vin = findVinInText(s);
    return {
      type: "TEXT",
      text: s,
      vin,
      label: vin ? `Listing text with VIN ${vin}` : "Listing text — the AI will extract the details",
      warnings: [],
    };
  }

  return {
    type: "INVALID",
    label: "Not recognized — paste an auction link, a 17-character VIN, or the full listing text",
    warnings: [],
  };
}
