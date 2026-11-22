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
import type { Metadata } from "next";
import Link from "next/link";

import { PricingTable } from "@/components/marketing/pricing-table";
import { JsonLd } from "@/components/seo/json-ld";
import { PACK_ORDER, PACKS, PLANS } from "@/lib/billing/plans";
import { BRAND_NAME } from "@/lib/brand";
import { appUrl } from "@/lib/config/deployment";
import { legalConfig } from "@/lib/config/legal";
import { faqSchema, organizationSchema, softwareApplicationSchema, websiteSchema } from "@/lib/seo/schema";
import { Showcase } from "@/components/marketing/showcase";
import { BidLadder, ScoreMeter } from "@/components/report/deal-card";
import { ChecklistItems, RiskFlagsList } from "@/components/report/overview-tab";
import { VerdictBadge } from "@/components/report/verdict-badge";
import { Badge } from "@/components/ui/badge";
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

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: { absolute: t("site.metaTitle") }, description: t("site.metaDescription"), alternates: { canonical: "/" } };
}

export default async function LandingPage() {
  const t = await getT();
  const now = new Date();
  const sample = runDemoFixtureOffline("audi-a3", now);
  const base = appUrl();
  const structured = [
    organizationSchema({
      name: BRAND_NAME,
      url: base,
      logo: `${base}/icons/icon-512.png`,
      email: legalConfig().isPlaceholder ? undefined : legalConfig().supportEmail,
    }),
    websiteSchema({ name: BRAND_NAME, url: base, description: t("site.metaDescription") }),
    softwareApplicationSchema({
      name: BRAND_NAME,
      url: base,
      description: t("site.metaDescription"),
      offers: [
        { name: "Free", price: 0, description: `${PLANS.FREE.monthlyCredits} free reports` },
        ...PACK_ORDER.map((id) => ({ name: `${PACKS[id].reports} reports`, price: PACKS[id].price, description: "Prepaid credits that never expire" })),
        { name: "Pro (monthly)", price: PLANS.PRO.priceMonthly },
        { name: "Business (monthly)", price: PLANS.BUSINESS.priceMonthly },
      ],
    }),
    faqSchema(FAQ.map((n) => ({ q: t(`landing.q${n}`), a: t(`landing.a${n}`) }))),
  ];
  return (
    <>
      <JsonLd data={structured} />
      <section className="relative overflow-hidden border-b">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,color-mix(in_oklab,var(--color-primary)_20%,transparent),transparent_62%)]"
        />
        <div aria-hidden="true" className="grid-lines pointer-events-none absolute inset-0 [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pt-16 pb-12 md:pt-24 lg:grid-cols-[1fr_1.05fr]">
          <div className="space-y-6">
            <Badge variant="outline" className="rise bg-card/60 gap-2 py-1 backdrop-blur">
              <span className="bg-go size-1.5 rounded-full" aria-hidden="true" /> Copart · IAAI · Bid.cars
            </Badge>
            <h1 className="rise text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-5xl xl:text-6xl" style={{ ["--i" as string]: 1 }}>
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
        <dl className="relative mx-auto grid max-w-6xl grid-cols-2 gap-px px-4 pb-14 md:grid-cols-4">
          {([1, 2, 3, 4] as const).map((n) => (
            <div key={n} className="rise border-l px-5 py-1 first:border-l-0 md:first:border-l" style={{ ["--i" as string]: 4 + n }}>
              <dd className="display text-3xl">{t(`landing.stat${n}Value`)}</dd>
              <dt className="text-muted-foreground mt-1 text-sm">{t(`landing.stat${n}Label`)}</dt>
            </div>
          ))}
        </dl>
      </section>

      <section id="how-it-works" className="scroll-mt-16 border-b">
        <div className="mx-auto max-w-6xl space-y-10 px-4 py-20">
          <div className="max-w-2xl space-y-3">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("landing.howTitle")}</h2>
            <p className="text-muted-foreground text-lg">{t("landing.howBody")}</p>
          </div>
          <ol className="grid gap-5 md:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="surface bg-card relative overflow-hidden rounded-2xl border p-6">
                <span className="display text-foreground/6 pointer-events-none absolute -top-3 right-3 text-8xl select-none" aria-hidden="true">
                  {s.n}
                </span>
                <div className="mb-5 flex items-center gap-3">
                  <span className="bg-primary/12 text-primary flex size-10 items-center justify-center rounded-xl">
                    <s.Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="eyebrow">{t("landing.step", { n: s.n })}</span>
                </div>
                <h3 className="text-lg font-semibold tracking-tight">{t(`landing.step${s.n}Title`)}</h3>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{t(`landing.step${s.n}Body`)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="sample" className="bg-muted/30 scroll-mt-16 border-b">
        <div className="mx-auto max-w-6xl space-y-10 px-4 py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl space-y-3">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("landing.sampleTitle")}</h2>
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
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("landing.featuresTitle")}</h2>
            <p className="text-muted-foreground text-lg">{t("landing.featuresBody")}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.n} className="surface surface-link bg-card rounded-2xl border p-5">
                <span className="bg-primary/12 text-primary mb-4 flex size-10 items-center justify-center rounded-xl">
                  <f.Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="font-semibold tracking-tight">{t(`landing.f${f.n}Title`)}</h3>
                <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">{t(`landing.f${f.n}Body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="scroll-mt-16 border-b">
        <div className="mx-auto max-w-6xl space-y-10 px-4 py-20">
          <div className="mx-auto max-w-2xl space-y-3 text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("landing.pricingTitle")}</h2>
            <p className="text-muted-foreground text-lg">{t("landing.pricingBody")}</p>
          </div>
          <PricingTable />
        </div>
      </section>

      <section id="faq" className="scroll-mt-16 border-b">
        <div className="mx-auto max-w-3xl space-y-8 px-4 py-20">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("landing.faqTitle")}</h2>
          <div className="surface bg-card divide-y rounded-2xl border">
            {FAQ.map((n) => (
              <details key={n} className="group px-6 py-4.5 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                  {t(`landing.q${n}`)}
                  <span
                    aria-hidden="true"
                    className="bg-muted text-muted-foreground grid size-6 shrink-0 place-items-center rounded-full transition-transform group-open:rotate-45"
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
        <div className="top-line dark text-foreground relative isolate mx-auto flex max-w-6xl flex-col items-center gap-6 overflow-hidden rounded-3xl border border-white/10 bg-[#0a0c14] px-6 py-16 text-center">
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-[radial-gradient(60%_80%_at_50%_0%,color-mix(in_oklab,var(--color-primary)_34%,transparent),transparent_70%)]"
          />
          <div aria-hidden="true" className="grid-lines absolute inset-0 -z-10 [mask-image:radial-gradient(60%_70%_at_50%_100%,black,transparent)]" />
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{t("landing.ctaTitle")}</h2>
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
