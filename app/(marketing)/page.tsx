import {
  ArrowRightIcon,
  BellIcon,
  CalculatorIcon,
  ChartScatterIcon,
  ClipboardCheckIcon,
  FileTextIcon,
  GaugeIcon,
  GlobeIcon,
  LayersIcon,
  LinkIcon,
  PuzzleIcon,
  ScanSearchIcon,
  ShieldAlertIcon,
  WrenchIcon,
} from "lucide-react";
import Link from "next/link";

import { PricingTable } from "@/components/marketing/pricing-table";
import { BidLadder, ScoreMeter } from "@/components/report/deal-card";
import { ChecklistItems, RiskFlagsList } from "@/components/report/overview-tab";
import { VerdictBadge } from "@/components/report/verdict-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DEFAULT_SETTINGS } from "@/lib/calc/build";
import type { ScenarioKey } from "@/lib/calc/types";
import { runDemoFixtureOffline } from "@/lib/demo/offline";
import { titleLabel } from "@/lib/i18n/labels";
import { getT } from "@/lib/i18n/server";
import type { Translator } from "@/lib/i18n/translate";
import { cn, formatNumber, formatUsd } from "@/lib/utils";

const STEPS = [
  { Icon: LinkIcon, n: 1 },
  { Icon: ScanSearchIcon, n: 2 },
  { Icon: GaugeIcon, n: 3 },
] as const;

const FEATURES = [
  { Icon: WrenchIcon, n: 1 },
  { Icon: ChartScatterIcon, n: 2 },
  { Icon: ShieldAlertIcon, n: 3 },
  { Icon: CalculatorIcon, n: 4 },
  { Icon: LayersIcon, n: 5 },
  { Icon: BellIcon, n: 6 },
  { Icon: GlobeIcon, n: 7 },
  { Icon: FileTextIcon, n: 8 },
  { Icon: PuzzleIcon, n: 9 },
] as const;

const FAQ = [1, 2, 3, 4, 5, 6] as const;

type Sample = ReturnType<typeof runDemoFixtureOffline>;

function SampleSummaryCard({ sample, t, className }: { sample: Sample; t: Translator; className?: string }) {
  const { listing, calc } = sample;
  return (
    <Card className={cn("shadow-lg", className)}>
      <CardContent className="space-y-5 pt-6">
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
            <div className="num text-2xl font-semibold tracking-tight">{formatUsd(calc.maxBid)}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">{t("report.comfortBid")}</div>
            <div className="num text-lg font-medium">{formatUsd(calc.comfortBid)}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">{t("report.breakEven")}</div>
            <div className="num text-lg font-medium">{formatUsd(calc.breakEvenBid)}</div>
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
    <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("landing.scenariosTitle", { amount: formatUsd(calc.maxBid) })}</CardTitle>
        </CardHeader>
        <CardContent>
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
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("landing.whatWeFlagged")}</CardTitle>
          </CardHeader>
          <CardContent>
            <RiskFlagsList flags={flags} />
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
  const sample = runDemoFixtureOffline("audi-a3", new Date());
  return (
    <>
      <section className="relative overflow-hidden border-b">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,color-mix(in_oklab,var(--color-primary)_16%,transparent),transparent_60%)]"
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:py-24 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-6">
            <Badge variant="outline" className="gap-1.5 py-1">
              Copart · IAAI · Bid.cars
            </Badge>
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">{t("landing.heroTitle")}</h1>
            <p className="text-muted-foreground max-w-xl text-lg text-pretty">{t("landing.heroBody")}</p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/app">
                  {t("common.analyzeLot")} <ArrowRightIcon />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="#sample">{t("landing.seeSample")}</Link>
              </Button>
            </div>
            <p className="text-muted-foreground text-sm">{t("landing.freeNote")}</p>
          </div>
          <SampleSummaryCard sample={sample} t={t} className="w-full lg:max-w-md lg:justify-self-end" />
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-16 border-b">
        <div className="mx-auto max-w-6xl space-y-10 px-4 py-16">
          <div className="max-w-2xl space-y-2">
            <h2 className="text-3xl font-semibold tracking-tight">{t("landing.howTitle")}</h2>
            <p className="text-muted-foreground">{t("landing.howBody")}</p>
          </div>
          <ol className="grid gap-4 md:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="bg-card rounded-xl border p-5">
                <div className="mb-4 flex items-center gap-3">
                  <span className="bg-primary/12 text-primary flex size-9 items-center justify-center rounded-lg">
                    <s.Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="text-muted-foreground text-xs font-medium">{t("landing.step", { n: s.n })}</span>
                </div>
                <h3 className="font-semibold">{t(`landing.step${s.n}Title`)}</h3>
                <p className="text-muted-foreground mt-1.5 text-sm">{t(`landing.step${s.n}Body`)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="sample" className="bg-muted/30 scroll-mt-16 border-b">
        <div className="mx-auto max-w-6xl space-y-8 px-4 py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl space-y-2">
              <h2 className="text-3xl font-semibold tracking-tight">{t("landing.sampleTitle")}</h2>
              <p className="text-muted-foreground">{t("landing.sampleBody")}</p>
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
        <div className="mx-auto max-w-6xl space-y-10 px-4 py-16">
          <div className="max-w-2xl space-y-2">
            <h2 className="text-3xl font-semibold tracking-tight">{t("landing.featuresTitle")}</h2>
            <p className="text-muted-foreground">{t("landing.featuresBody")}</p>
          </div>
          <div className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.n} className="flex gap-3">
                <f.Icon className="text-primary mt-0.5 size-5 shrink-0" aria-hidden="true" />
                <div>
                  <h3 className="font-medium">{t(`landing.f${f.n}Title`)}</h3>
                  <p className="text-muted-foreground mt-1 text-sm">{t(`landing.f${f.n}Body`)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="scroll-mt-16 border-b">
        <div className="mx-auto max-w-6xl space-y-10 px-4 py-16">
          <div className="mx-auto max-w-2xl space-y-2 text-center">
            <h2 className="text-3xl font-semibold tracking-tight">{t("landing.pricingTitle")}</h2>
            <p className="text-muted-foreground">{t("landing.pricingBody")}</p>
          </div>
          <PricingTable />
        </div>
      </section>

      <section id="faq" className="scroll-mt-16 border-b">
        <div className="mx-auto max-w-3xl space-y-8 px-4 py-16">
          <h2 className="text-3xl font-semibold tracking-tight">{t("landing.faqTitle")}</h2>
          <div className="divide-y rounded-xl border">
            {FAQ.map((n) => (
              <details key={n} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                  {t(`landing.q${n}`)}
                  <span aria-hidden="true" className="text-muted-foreground transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="text-muted-foreground mt-3 text-sm leading-relaxed">{t(`landing.a${n}`)}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 py-20 text-center">
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance">{t("landing.ctaTitle")}</h2>
          <Button asChild size="lg">
            <Link href="/app">
              {t("common.analyzeLot")} <ArrowRightIcon />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
