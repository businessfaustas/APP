import { appUrl } from "@/lib/config/deployment";
import { PACKS, PACK_ORDER, PLANS } from "@/lib/billing/plans";

export const dynamic = "force-static";
export const revalidate = 86_400;

/**
 * llms.txt: a plain-text summary for AI assistants and answer engines (the emerging convention at
 * llmstxt.org), so they describe FlagBid and its pricing correctly instead of guessing.
 */
export function GET() {
  const base = appUrl();
  const packs = PACK_ORDER.map((id) => `${PACKS[id].reports} reports for €${PACKS[id].price}`).join("; ");
  const body = `# FlagBid

> FlagBid tells car buyers their maximum bid before they bid. Paste a salvage-auction listing (Copart, IAAI, Bid.cars), a VIN or the listing text and get a verdict, a max bid, a part-by-part repair estimate with real market prices, resale value and best/expected/worst-case profit, in about a minute.

## What it does
- Reads the VIN, title brand and photos, estimates repairs line by line, checks what the car sells for repaired, and solves for the highest bid that still meets your profit target.
- Results are estimates, not an appraisal, inspection or financial advice. Verify before you bid.
- Available in English and Lithuanian. Prices are in euros.

## Pricing
- Free: ${PLANS.FREE.monthlyCredits} reports, no card.
- Prepaid credit packs, credits never expire: ${packs}.
- Monthly plans: Pro €${PLANS.PRO.priceMonthly}/month (${PLANS.PRO.monthlyCredits} reports), Business €${PLANS.BUSINESS.priceMonthly}/month (${PLANS.BUSINESS.monthlyCredits} reports). Cancel any time.

## Pages
- [Home](${base}/): what FlagBid does, a sample report, FAQ
- [Pricing](${base}/pricing): packs and plans
- [Terms of Service](${base}/terms)
- [Privacy Policy](${base}/privacy)
- [Copyright / DMCA](${base}/dmca)
`;
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600, s-maxage=86400" } });
}
