import type { AuctionSource } from "@/lib/domain/schemas";

export interface DetectedUrl {
  source: AuctionSource;
  lotNumber: string | null;
  url: string;
  host: string;
}

const PATTERNS: { host: RegExp; source: AuctionSource; lot: RegExp[] }[] = [
  { host: /(^|\.)copart\.(com|ca|co\.uk|de)$/i, source: "COPART", lot: [/\/lot\/(\d{5,10})/i, /[?&]lotId=(\d{5,10})/i] },
  {
    host: /(^|\.)iaai\.com$/i,
    source: "IAAI",
    lot: [/VehicleDetail\/(\d{5,10})/i, /[?&]itemid=(\d{5,10})/i, /[?&]stock(?:number)?=(\d{5,10})/i, /\/vehicle\/(\d{5,10})/i],
  },
  { host: /(^|\.)bid\.cars$/i, source: "BIDCARS", lot: [/\/lot\/([0-9]-\d{5,10})/i, /\/lot\/(\d{5,10})/i] },
  { host: /(^|\.)autobidmaster\.com$/i, source: "AUTOBIDMASTER", lot: [/\/lot\/(\d{5,10})/i] },
  { host: /(^|\.)abetter\.bid$/i, source: "OTHER", lot: [/\/lot\/(\d{5,10})/i, /\/(\d{7,10})(?:[/?#-]|$)/] },
  { host: /(^|\.)salvagebid\.com$/i, source: "OTHER", lot: [/\/lot\/(\d{5,10})/i, /\/(\d{7,10})(?:[/?#-]|$)/] },
];

/** Hosts the server may fetch through the scraping provider. */
export const KNOWN_AUCTION_HOSTS = PATTERNS.map((p) => p.host);

export function looksLikeUrl(raw: string): boolean {
  const s = raw.trim();
  if (/^https?:\/\//i.test(s)) return true;
  return /^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+\/\S*$/i.test(s) && !/\s/.test(s);
}

export function toUrl(raw: string): URL | null {
  const s = raw.trim();
  try {
    return new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
  } catch {
    return null;
  }
}

export function detectAuctionUrl(raw: string): DetectedUrl | null {
  const url = toUrl(raw);
  if (!url || !/^https?:$/.test(url.protocol)) return null;
  const host = url.hostname.toLowerCase();
  const pathAndQuery = `${url.pathname}${url.search}`;
  for (const p of PATTERNS) {
    if (!p.host.test(host)) continue;
    let lot: string | null = null;
    for (const re of p.lot) {
      const m = pathAndQuery.match(re);
      if (m?.[1]) {
        lot = m[1];
        break;
      }
    }
    return { source: p.source, lotNumber: lot, url: url.toString(), host };
  }
  const generic = pathAndQuery.match(/lot[/=_-]?(\d{6,10})/i);
  return { source: "OTHER", lotNumber: generic?.[1] ?? null, url: url.toString(), host };
}

export function sourceLabel(source: AuctionSource): string {
  switch (source) {
    case "COPART":
      return "Copart";
    case "IAAI":
      return "IAAI";
    case "BIDCARS":
      return "Bid.cars";
    case "AUTOBIDMASTER":
      return "AutoBidMaster";
    case "MANUAL":
      return "Manual";
    default:
      return "Other";
  }
}
