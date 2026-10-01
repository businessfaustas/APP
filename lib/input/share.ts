import { findVinInText } from "./parseInput";
import { detectAuctionUrl } from "./urls";

const URL_RE = /https?:\/\/[^\s<>"']+/gi;

/**
 * Picks what to analyze from an OS share (PWA share_target). Apps put the link in `url`,
 * `text` or both, often with extra words around it. Preference: an auction lot URL, then a
 * VIN, then any URL, then the shared text itself (e.g. a copied listing).
 */
export function pickSharedInput(p: { url?: string | null; text?: string | null; title?: string | null }): string {
  const fields = [p.url, p.text, p.title].map((s) => (s ?? "").trim()).filter(Boolean);
  const urls = fields.flatMap((f) => f.match(URL_RE) ?? []).map((u) => u.replace(/[).,;!?]+$/, ""));
  const lot = urls.find((u) => {
    const d = detectAuctionUrl(u);
    return d !== null && d.source !== "OTHER" && d.lotNumber !== null;
  });
  if (lot) return lot;
  for (const f of fields) {
    const vin = findVinInText(f);
    if (vin) return vin;
  }
  if (urls[0]) return urls[0];
  return (p.text ?? p.title ?? "").trim().slice(0, 5000);
}
