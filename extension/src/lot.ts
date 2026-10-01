/**
 * Pure helpers shared by the content script and unit tests: is this a lot page, and which
 * images on it are vehicle photos. Lot detection reuses the app's own URL patterns.
 */
import { detectAuctionUrl } from "../../lib/input/urls";

export const LIMITS = { pageText: 200_000, html: 2_000_000, jsonLdItems: 20, jsonLdItem: 100_000, images: 80 } as const;

export function lotFromUrl(href: string): { source: string; lotNumber: string } | null {
  const d = detectAuctionUrl(href);
  if (!d || d.source === "OTHER" || !d.lotNumber) return null;
  return { source: d.source, lotNumber: d.lotNumber };
}

export interface ImageCandidate {
  url: string;
  /** Rendered/natural width when known (0 for lazy images that haven't loaded). */
  width: number;
}

const PHOTO_HOSTS = [/(^|\.)copart\.com$/i, /(^|\.)iaai\.com$/i, /(^|\.)bid\.cars$/i, /(^|\.)cloudfront\.net$/i];
const NOT_A_PHOTO = /(logo|icon|sprite|avatar|badge|flag|banner|placeholder|blank|spinner|loader|pixel|tracking)/i;

/** Copart serves thumbnails as *_thb.jpg next to full-size *_ful.jpg / high-res *_hrs.jpg. */
function upgrade(u: URL): URL {
  if (/copart\.com$/i.test(u.hostname)) u.pathname = u.pathname.replace(/_thb\.(jpe?g)$/i, "_ful.$1");
  return u;
}

export function selectImageUrls(candidates: ImageCandidate[], pageUrl: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const c of candidates) {
    let u: URL;
    try {
      u = upgrade(new URL(c.url, pageUrl));
    } catch {
      continue;
    }
    if (u.protocol !== "https:") continue;
    const path = u.pathname.toLowerCase();
    if (/\.(svg|gif|ico)$/.test(path) || NOT_A_PHOTO.test(path)) continue;
    const knownHost = PHOTO_HOSTS.some((re) => re.test(u.hostname));
    const photoLike = /\.(jpe?g|png|webp)$/.test(path) || /resizer|image|photo|img/i.test(path + u.search);
    if (!(knownHost && photoLike) && c.width < 300) continue;
    const key = `${u.hostname}${u.pathname}${/resizer/i.test(path) ? u.search : ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(u.toString());
    if (out.length >= LIMITS.images) break;
  }
  return out;
}

export function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) : s;
}
