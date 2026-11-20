import { ArrowRightIcon, ClipboardCheckIcon } from "lucide-react";
import Link from "next/link";

import { PricingTable } from "@/components/marketing/pricing-table";
import { Showcase } from "@/components/marketing/showcase";
import { BidLadder, ScoreMeter } from "@/components/report/deal-card";
import { ChecklistItems, RiskFlagsList } from "@/components/report/overview-tab";
import { VerdictBadge } from "@/components/report/verdict-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DEFAULT_SETTINGS } from "@/lib/calc/build";
import type { ScenarioKey } from "@/lib/calc/types";
import { runDemoFixtureOffline } from "@/lib/demo/offline";
import { demoShowcase } from "@/lib/demo/showcase";
import { titleLabel } from "@/lib/i18n/labels";
import { getT } from "@/lib/i18n/server";
import type { Translator } from "@/lib/i18n/translate";
import { cn, formatNumber, formatUsd } from "@/lib/utils";

const STEPS = [1, 2, 3] as const;
const FEATURES = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
const pad = (n: number) => String(n).padStart(2, "0");

const FAQ = [1, 2, 3, 4, 5, 6] as const;

type Sample = ReturnType<typeof runDemoFixtureOffline>;

function SampleSummaryCard({ sample, t, className }: { sample: Sample; t: Translator; className?: string }) {
  const { listing, calc } = sample;
  return (
    <Card className={className}>
      <CardContent className="space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate font-semibold">
              {listing.year} {listing.make === "AUDI" ? "Audi" : listing.make} {listing.model} {listing.trim}
            </div>
            <div className="text-muted-foreground text-xs">
              {listing.location.yardName} · {titleLabel(t, listing.titleCategory)} · {t("landing.sampleDamage")} · {formatNumber(listing.odometer)}{" "}
              {t("domain.mi")}
            </div>
          </div>
          <VerdictBadge verdict={calc.verdict} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="text-muted-foreground text-xs">{t("report.maxBid")}</div>
            <div className="display num text-4xl">{formatUsd(calc.maxBid)}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">{t("report.comfortBid")}</div>
            <div className="display num text-2xl">{formatUsd(calc.comfortBid)}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">{t("report.breakEven")}</div>
            <div className="display num text-2xl">{formatUsd(calc.breakEvenBid)}</div>
          </div>
        </div>
        <BidLadder calc={calc} currentBid={listing.currentBid} />
        <ScoreMeter score={calc.dealScore} />
      </CardContent>
    </Card>
  );
}

function SampleReport({ sample, t }: { sample: Sample; t: Translator }) {
  const { listing, assembled, calc } = sample;
  const flags = assembled.flags.filter((f) => f.level !== "INFO").concat(assembled.flags.filter((f) => f.level === "INFO").slice(0, 2));
  const keys: ScenarioKey[] = ["best", "expected", "worst"];
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[1.15fr_1fr]">
      <div className="min-w-0 space-y-5">
        <SampleSummaryCard sample={sample} t={t} />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("landing.scenariosTitle", { amount: formatUsd(calc.maxBid) })}</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">{t("landing.scenariosCaption")}</caption>
              <thead>
                <tr className="text-muted-foreground border-b text-left text-xs">
                  <th scope="col" className="py-2 font-medium" />
                  {keys.map((k) => (
                    <th key={k} scope="col" className="py-2 pl-3 text-right font-medium">
                      {t(`domain.scenario.${k}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="num">
                <tr className="border-b">
                  <th scope="row" className="text-muted-foreground py-2 text-left font-normal">
                    {t("report.resale")}
                  </th>
                  {keys.map((k) => (
                    <td key={k} className="py-2 pl-3 text-right">
                      {formatUsd(calc.scenarios[k].resale)}
                    </td>
                  ))}
                </tr>
                <tr className="border-b">
                  <th scope="row" className="text-muted-foreground py-2 text-left font-normal">
                    {t("report.repair")}
                  </th>
                  {keys.map((k) => (
                    <td key={k} className="py-2 pl-3 text-right">
                      {formatUsd(calc.scenarios[k].repair)}
                    </td>
                  ))}
                </tr>
                <tr className="border-b">
                  <th scope="row" className="text-muted-foreground py-2 text-left font-normal">
                    {t("landing.bidFeesOther")}
                  </th>
                  {keys.map((k) => {
                    const s = calc.scenarios[k];
                    return (
                      <td key={k} className="py-2 pl-3 text-right">
                        {formatUsd(s.totalCostAtMaxBid === null ? null : s.totalCostAtMaxBid - s.repair)}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <th scope="row" className="py-2 text-left font-medium">
                    {t("report.profit")}
                  </th>
                  {keys.map((k) => {
                    const p = calc.scenarios[k].profitAtMaxBid;
                    return (
                      <td key={k} className={cn("py-2 pl-3 text-right font-semibold", p !== null && p < 0 ? "text-stop" : "text-go")}>
                        {formatUsd(p)}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
            <p className="text-muted-foreground mt-4 text-xs">
              {t("landing.sampleNote", { bid: formatUsd(listing.currentBid), rate: formatUsd(DEFAULT_SETTINGS.laborRate) })}
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="min-w-0 space-y-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("landing.whatWeFlagged")}</CardTitle>
          </CardHeader>
          <CardContent>
            <RiskFlagsList flags={flags} interactive={false} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardCheckIcon className="text-primary size-4" aria-hidden="true" /> {t("landing.inspectFirst")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal space-y-1.5 pl-5 text-sm">
              <ChecklistItems items={assembled.checklist.slice(0, 3)} />
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default async function LandingPage() {
  const t = await getT();
  const now = new Date();
  const sample = runDemoFixtureOffline("audi-a3", now);
  return (
    <>
      <section className="relative overflow-hidden border-b">
        <div aria-hidden="true" className="grid-lines pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pt-14 pb-12 md:pt-20 lg:grid-cols-[1fr_1.05fr]">
          <div className="space-y-6">
            <div className="eyebrow rise">Copart · IAAI · Bid.cars</div>
            <h1 className="rise text-[2.9rem] leading-[0.95] text-balance sm:text-6xl xl:text-7xl" style={{ ["--i" as string]: 1 }}>
              {t("landing.heroTitle")}
            </h1>
            <p className="rise text-muted-foreground max-w-xl text-lg text-pretty" style={{ ["--i" as string]: 2 }}>
              {t("landing.heroBody")}
            </p>
            <div className="rise flex flex-wrap gap-3" style={{ ["--i" as string]: 3 }}>
              <Button asChild size="lg">
                <Link href="/app">
                  {t("common.analyzeLot")} <ArrowRightIcon />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="#sample">{t("landing.seeSample")}</Link>
              </Button>
            </div>
            <p className="rise text-muted-foreground text-sm" style={{ ["--i" as string]: 4 }}>
              {t("landing.freeNote")}
            </p>
          </div>
          <Showcase data={demoShowcase(t, now)} className="rise" />
        </div>
        {/* the timing board: four figures, each marked with a slanted orange bar */}
        <dl className="relative mx-auto grid max-w-6xl grid-cols-2 gap-y-6 px-4 pb-14 md:grid-cols-4">
          {([1, 2, 3, 4] as const).map((n) => (
            <div
              key={n}
              className="rise before:bg-primary relative pl-6 before:absolute before:top-1 before:bottom-1 before:left-0 before:w-[3px] before:skew-x-[-12deg]"
              style={{ ["--i" as string]: 4 + n }}
            >
              <dd className="display text-5xl leading-none">{t(`landing.stat${n}Value`)}</dd>
              <dt className="eyebrow mt-2 before:hidden">{t(`landing.stat${n}Label`)}</dt>
            </div>
          ))}
        </dl>
      </section>

      <section id="how-it-works" className="scroll-mt-16 border-b">
        <div className="mx-auto max-w-6xl space-y-12 px-4 py-20">
          <div className="max-w-2xl space-y-3">
            <h2 className="text-4xl sm:text-5xl">{t("landing.howTitle")}</h2>
            <p className="text-muted-foreground text-lg">{t("landing.howBody")}</p>
          </div>
          <ol className="grid gap-12 md:grid-cols-3 md:gap-10">
            {STEPS.map((n) => (
              <li key={n}>
                <div className="flex items-end gap-4">
                  <span className="display text-8xl leading-[0.8] text-transparent [-webkit-text-stroke:1.5px_var(--primary)]" aria-hidden="true">
                    {pad(n)}
                  </span>
                  <span className="bg-primary/50 mb-1 h-[3px] flex-1 skew-x-[-30deg]" aria-hidden="true" />
                </div>
                <h3 className="font-display mt-5 text-2xl tracking-[0.03em] uppercase">{t(`landing.step${n}Title`)}</h3>
                <p className="text-muted-foreground mt-2 leading-relaxed">{t(`landing.step${n}Body`)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="sample" className="bg-muted/30 scroll-mt-16 border-b">
        <div className="mx-auto max-w-6xl space-y-10 px-4 py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl space-y-3">
              <h2 className="text-4xl sm:text-5xl">{t("landing.sampleTitle")}</h2>
              <p className="text-muted-foreground text-lg">{t("landing.sampleBody")}</p>
            </div>
            <Button asChild variant="outline">
              <Link href="/app">
                {t("landing.analyzeYourOwn")} <ArrowRightIcon />
              </Link>
            </Button>
          </div>
          <SampleReport sample={sample} t={t} />
        </div>
      </section>

      <section className="border-b">
        <div className="mx-auto max-w-6xl space-y-10 px-4 py-20">
          <div className="max-w-2xl space-y-3">
            <h2 className="text-4xl sm:text-5xl">{t("landing.featuresTitle")}</h2>
            <p className="text-muted-foreground text-lg">{t("landing.featuresBody")}</p>
          </div>
          {/* a spec sheet, not a grid of cards: numbered rows between hairlines */}
          <ul className="grid border-t md:grid-cols-2 md:gap-x-14">
            {FEATURES.map((n) => (
              <li key={n} className="group hover:bg-accent/40 grid grid-cols-[3.25rem_1fr] gap-4 border-b px-1 py-5 transition-colors">
                <span className="display text-primary text-4xl leading-none" aria-hidden="true">
                  {pad(n)}
                </span>
                <div>
                  <h3 className="font-display text-xl tracking-[0.04em] uppercase">{t(`landing.f${n}Title`)}</h3>
                  <p className="text-muted-foreground mt-1.5 text-[0.95rem] leading-relaxed">{t(`landing.f${n}Body`)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="pricing" className="scroll-mt-16 border-b">
        <div className="mx-auto max-w-6xl space-y-10 px-4 py-20">
          <div className="mx-auto max-w-2xl space-y-3 text-center">
            <h2 className="text-4xl sm:text-5xl">{t("landing.pricingTitle")}</h2>
            <p className="text-muted-foreground text-lg">{t("landing.pricingBody")}</p>
          </div>
          <PricingTable />
        </div>
      </section>

      <section id="faq" className="scroll-mt-16 border-b">
        <div className="mx-auto max-w-3xl space-y-8 px-4 py-20">
          <h2 className="text-4xl sm:text-5xl">{t("landing.faqTitle")}</h2>
          <div className="surface bg-card divide-y rounded-2xl border">
            {FAQ.map((n) => (
              <details key={n} className="group px-6 py-4.5 [&_summary::-webkit-details-marker]:hidden">
                <summary className="font-display flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold tracking-[0.03em] uppercase">
                  {t(`landing.q${n}`)}
                  <span
                    aria-hidden="true"
                    className="bg-muted text-muted-foreground grid size-6 shrink-0 skew-x-[-12deg] place-items-center rounded-[2px] transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="text-muted-foreground mt-3 text-sm leading-relaxed">{t(`landing.a${n}`)}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-20">
        <div className="top-line dark text-foreground relative isolate mx-auto flex max-w-6xl flex-col items-center gap-6 overflow-hidden rounded-3xl border border-white/10 bg-[#13110f] px-6 py-16 text-center">
          <div aria-hidden="true" className="grid-lines absolute inset-0 -z-10 [mask-image:linear-gradient(to_top,black,transparent_75%)]" />
          <h2 className="max-w-3xl text-4xl text-balance italic sm:text-6xl">{t("landing.ctaTitle")}</h2>
          <Button asChild size="lg">
            <Link href="/app">
              {t("common.analyzeLot")} <ArrowRightIcon />
            </Link>
          </Button>
          <p className="text-muted-foreground text-sm">{t("landing.freeNote")}</p>
        </div>
      </section>
    </>
  );
}
