import "server-only";

import { llmEstimateDestinationMarket } from "@/lib/ai/prompts/estimates";
import { applyBps } from "@/lib/calc/money";
import type { DestinationMarket } from "@/lib/domain/schemas";
import { countryName } from "@/lib/geo/countries";
import { destinationMeta, milesToKm } from "@/lib/geo/markets";
import type { Locale } from "@/lib/i18n/locales";

import { toUsd, usdPerUnit } from "../fx";

export interface DestinationRequest {
  profile: { countryCode: string; currency: string; vatBps: number };
  /** One line, e.g. "2025 BMW M4 Competition". */
  vehicle: string;
  details: string;
  mileageMiles: number | null;
  listToSaleBps: number;
  analysisId: string;
  locale?: Locale;
}

const safeUrl = (u: string | null) => (u && /^https:\/\//i.test(u) ? u : null);

/**
 * What an undamaged copy of the car sells for where the buyer exports to, in dollars with VAT as advertised. Null when the AI
 * is unavailable or its answer is not plausible: the report then asks for the destination resale price instead of guessing.
 */
export async function valueDestinationMarket(req: DestinationRequest): Promise<DestinationMarket | null> {
  const meta = destinationMeta(req.profile.countryCode);
  const country = meta?.country ?? countryName(req.profile.countryCode, "en");
  const currency = meta?.currency ?? req.profile.currency;
  let est;
  try {
    est = await llmEstimateDestinationMarket({
      vehicle: req.vehicle,
      details: req.details,
      mileageKm: req.mileageMiles ? milesToKm(req.mileageMiles) : null,
      country,
      currency,
      sites: meta?.sites ?? [],
      analysisId: req.analysisId,
      locale: req.locale,
    });
  } catch (err) {
    console.error("Destination market estimate failed", err);
    return null;
  }
  const fx = await usdPerUnit(currency);
  const usd = (n: number) => applyBps(toUsd(n, fx.usdPerUnit), req.listToSaleBps);
  const notes: string[] = [];
  // These sentences are translated by lib/i18n (gen.market.dest*): keep them free of the country name.
  notes.push(
    est.grounded
      ? `AI read ${est.listings.length} current listings in the destination country. Prices include VAT as advertised.`
      : "Fewer than three comparable listings were found in the destination country, so this is an AI estimate. Check real listings there before bidding.",
  );
  if (!fx.live) notes.push("The exchange rate is approximate: the live rate was unavailable.");
  if (est.reasoning.trim()) notes.push(est.reasoning.trim());
  return {
    countryCode: req.profile.countryCode,
    currency,
    usdPerUnit: fx.usdPerUnit,
    fxLive: fx.live,
    vatBps: req.profile.vatBps,
    provider: est.grounded ? "AI market research (web)" : "AI estimate — verify",
    grounded: est.grounded,
    confidence: est.grounded ? 0.45 : 0.25,
    grossClean: { worst: usd(est.p25), expected: usd(est.p50), best: usd(est.p75) },
    listings: est.listings.map((l) => ({
      price: l.price,
      priceUsd: toUsd(l.price, fx.usdPerUnit),
      mileageKm: l.mileage_km,
      trim: l.trim,
      location: l.location,
      url: safeUrl(l.url),
    })),
    notes,
  };
}
