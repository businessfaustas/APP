import type { ShowcaseData } from "@/components/marketing/showcase";
import { bodyOf } from "@/lib/analysis/visual";
import type { Translator } from "@/lib/i18n/translate";
import { paintOf } from "@/lib/vehicle/art";

import { runDemoFixtureOffline } from "./offline";

/** The Audi A3 demo lot's real numbers, shaped for the marketing showcase. */
export function demoShowcase(t: Translator, now: Date = new Date()): ShowcaseData {
  const { fx, listing, calc } = runDemoFixtureOffline("audi-a3", now);
  const make = listing.make ? listing.make.charAt(0) + listing.make.slice(1).toLowerCase() : "";
  return {
    title: [listing.year, make, listing.model].filter(Boolean).join(" "),
    source: t(`domain.source.${listing.source}`),
    verdict: calc.verdict,
    maxBid: calc.maxBid,
    score: calc.dealScore,
    repair: calc.scenarios.expected.repair,
    zones: fx.damage.impact_zones.map((z) => ({ zone: z.zone, severity: z.severity })),
    paint: paintOf(listing.color),
    body: bodyOf(listing, fx.vehicle),
  };
}
