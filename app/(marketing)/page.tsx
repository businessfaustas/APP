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
import { RiskFlagsList } from "@/components/report/overview-tab";
import { VerdictBadge } from "@/components/report/verdict-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DEFAULT_SETTINGS } from "@/lib/calc/build";
import type { ScenarioKey } from "@/lib/calc/types";
import { TITLE_LABELS } from "@/lib/domain/titles";
import { runDemoFixtureOffline } from "@/lib/demo/offline";
import { cn, formatNumber, formatUsd } from "@/lib/utils";

const STEPS = [
  {
    Icon: LinkIcon,
    title: "Paste a link",
    body: "Drop in a Copart, IAAI or Bid.cars lot URL, a VIN, or the listing text. The browser extension adds an Analyze button right on the lot page.",
  },
  {
    Icon: ScanSearchIcon,
    title: "We do the homework",
    body: "VIN decode, title brand, photo-by-photo damage review, an itemized repair estimate, comparable retail listings, auction fees, transport and holding costs.",
  },
  {
    Icon: GaugeIcon,
    title: "Bid with a number",
    body: "A GO / BE CAUTIOUS / WALK AWAY verdict, your maximum bid for your profit target, a comfort bid that survives the worst case, and what to inspect first.",
  },
];

const FEATURES = [
  { Icon: WrenchIcon, title: "Itemized repair estimate", body: "Parts by source (OEM, aftermarket, used), body, paint and mechanical hours at your labor rate, plus hidden-damage probabilities." },
  { Icon: ChartScatterIcon, title: "Market value from comps", body: "Retail comparables adjusted for mileage and title brand, with best / expected / worst resale instead of one optimistic number." },
  { Icon: ShieldAlertIcon, title: "Risk flags", body: "Non-repairable titles, flood signs, deployed airbags, EV battery exposure, frame damage, odometer issues and seller-specific traps." },
  { Icon: CalculatorIcon, title: "What-if sliders", body: "Change labor rate, parts preference, resale, profit target or buyer type and the max bid updates instantly — no extra credit." },
  { Icon: LayersIcon, title: "Batch compare", body: "Paste up to 10 lots and rank them side by side by deal score, max bid headroom and expected profit." },
  { Icon: BellIcon, title: "Watchlist reminders", body: "Save lots you like and get an email before the sale with your max bid, so you don't overpay in the heat of the auction." },
  { Icon: GlobeIcon, title: "Export mode", body: "Landed cost to the EU — inland to port, ocean freight, insurance, duty and VAT on CIF — against destination resale prices." },
  { Icon: FileTextIcon, title: "PDF & share links", body: "Send a clean report to a partner, a body shop or a buyer with one read-only link." },
  { Icon: PuzzleIcon, title: "Browser extension", body: "Analyze straight from the auction page, including photos and details that only show when you're signed in." },
];

const FAQ = [
  {
    q: "How accurate is the repair estimate?",
    a: "It's a structured estimate, not a body-shop quote. Every line shows its source, hours and probability, and the report gives a best / expected / worst range rather than one number. Photos can't show everything, so hidden damage is priced as probability-weighted lines and an extra contingency in the worst case. Calibrate labor rates and part prices to your own shop in Settings.",
  },
  {
    q: "Where does the max bid come from?",
    a: "We solve for the highest bid where the expected-case profit still meets your target after auction fees, broker fee, transport, repairs, holding and selling costs. The comfort bid is where even the worst case breaks even; break-even is where the expected case makes zero.",
  },
  {
    q: "Which auctions are supported?",
    a: "Copart, IAAI and Bid.cars links, plus any listing you paste as text or enter by hand. Some auction pages hide details behind a login — the browser extension sends what you can see so nothing is missed.",
  },
  {
    q: "Are auction fees up to date?",
    a: "Fee tables are editable by your team and clearly marked when they're placeholders. Auctions change fees often and by buyer type, so confirm the current schedule before you rely on a number.",
  },
  {
    q: "Can I use it if I export cars?",
    a: "Yes. Export mode adds inland transport to the port, ocean freight, marine insurance, customs duty and VAT on the CIF value, registration and compliance costs, and compares against destination resale prices.",
  },
  {
    q: "What happens to my data?",
    a: "Reports are private to your account unless you create a share link. You can export or delete everything from Settings. See the Privacy Policy for details.",
  },
];

const SCENARIO_LABEL: Record<ScenarioKey, string> = { best: "Best", expected: "Expected", worst: "Worst" };

type Sample = ReturnType<typeof runDemoFixtureOffline>;

function SampleSummaryCard({ sample, className }: { sample: Sample; className?: string }) {
  const { listing, calc } = sample;
  return (
    <Card className={cn("shadow-lg", className)}>
      <CardContent className="space-y-5 pt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate font-semibold">
              {listing.year} {listing.make === "AUDI" ? "Audi" : listing.make} {listing.model} {listing.trim}
            </div>
            <div className="text-xs text-muted-foreground">
              {listing.location.yardName} · {TITLE_LABELS[listing.titleCategory]} · Front end · {formatNumber(listing.odometer)} mi
            </div>
          </div>
          <VerdictBadge verdict={calc.verdict} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="text-xs text-muted-foreground">Max bid</div>
            <div className="num text-2xl font-semibold tracking-tight">{formatUsd(calc.maxBid)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Comfort bid</div>
            <div className="num text-lg font-medium">{formatUsd(calc.comfortBid)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Break-even</div>
            <div className="num text-lg font-medium">{formatUsd(calc.breakEvenBid)}</div>
          </div>
        </div>
        <BidLadder calc={calc} currentBid={listing.currentBid} />
        <ScoreMeter score={calc.dealScore} />
      </CardContent>
    </Card>
  );
}

function SampleReport({ sample }: { sample: Sample }) {
  const { listing, assembled, calc } = sample;
  const flags = assembled.flags.filter((f) => f.level !== "INFO").concat(assembled.flags.filter((f) => f.level === "INFO").slice(0, 2));
  const keys: ScenarioKey[] = ["best", "expected", "worst"];
  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Three scenarios at the max bid of {formatUsd(calc.maxBid)}</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <caption className="sr-only">Resale, repair, other costs and profit per scenario</caption>
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th scope="col" className="py-2 font-medium" />
                {keys.map((k) => (
                  <th key={k} scope="col" className="py-2 pl-3 text-right font-medium">
                    {SCENARIO_LABEL[k]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="num">
              <tr className="border-b">
                <th scope="row" className="py-2 text-left font-normal text-muted-foreground">
                  Resale
                </th>
                {keys.map((k) => (
                  <td key={k} className="py-2 pl-3 text-right">
                    {formatUsd(calc.scenarios[k].resale)}
                  </td>
                ))}
              </tr>
              <tr className="border-b">
                <th scope="row" className="py-2 text-left font-normal text-muted-foreground">
                  Repair
                </th>
                {keys.map((k) => (
                  <td key={k} className="py-2 pl-3 text-right">
                    {formatUsd(calc.scenarios[k].repair)}
                  </td>
                ))}
              </tr>
              <tr className="border-b">
                <th scope="row" className="py-2 text-left font-normal text-muted-foreground">
                  Bid, fees & other
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
                  Profit
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
          <p className="mt-4 text-xs text-muted-foreground">
            Current bid {formatUsd(listing.currentBid)}. Repair includes parts, labor at {formatUsd(DEFAULT_SETTINGS.laborRate)}/h, paint materials, probability-weighted hidden
            damage (like a front radar calibration) and a contingency that grows in the worst case.
          </p>
        </CardContent>
      </Card>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">What we flagged</CardTitle>
          </CardHeader>
          <CardContent>
            <RiskFlagsList flags={flags} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardCheckIcon className="size-4 text-primary" aria-hidden="true" /> Inspect first
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal space-y-1.5 pl-5 text-sm">
              {assembled.checklist.slice(0, 3).map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const sample = runDemoFixtureOffline("audi-a3", new Date());
  return (
    <>
      <section className="relative overflow-hidden border-b">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,color-mix(in_oklab,var(--color-primary)_16%,transparent),transparent_60%)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:py-24 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-6">
            <Badge variant="outline" className="gap-1.5 py-1">
              Copart · IAAI · Bid.cars
            </Badge>
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">Know your max bid before you bid.</h1>
            <p className="max-w-xl text-lg text-pretty text-muted-foreground">
              Paste a salvage auction link. AuctionPulse reads the VIN, title and every photo, prices the repair line by line, checks what the car sells for
              fixed, and tells you exactly where to stop bidding.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/app">
                  Analyze a lot <ArrowRightIcon />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="#sample">See a sample report</Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">3 free reports every month. No card needed.</p>
          </div>
          <SampleSummaryCard sample={sample} className="w-full lg:max-w-md lg:justify-self-end" />
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-16 border-b">
        <div className="mx-auto max-w-6xl space-y-10 px-4 py-16">
          <div className="max-w-2xl space-y-2">
            <h2 className="text-3xl font-semibold tracking-tight">From lot page to bid limit in about a minute</h2>
            <p className="text-muted-foreground">The research a careful flipper does by hand — done the same way, every time, before every bid.</p>
          </div>
          <ol className="grid gap-4 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="rounded-xl border bg-card p-5">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-primary/12 text-primary">
                    <s.Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">Step {i + 1}</span>
                </div>
                <h3 className="font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="sample" className="scroll-mt-16 border-b bg-muted/30">
        <div className="mx-auto max-w-6xl space-y-8 px-4 py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl space-y-2">
              <h2 className="text-3xl font-semibold tracking-tight">A real report, not a vibe</h2>
              <p className="text-muted-foreground">
                A 2019 Audi A3 with front-end damage on a Texas salvage title. Every number below comes from the same engine your reports use.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/app">
                Analyze your own lot <ArrowRightIcon />
              </Link>
            </Button>
          </div>
          <SampleReport sample={sample} />
        </div>
      </section>

      <section className="border-b">
        <div className="mx-auto max-w-6xl space-y-10 px-4 py-16">
          <div className="max-w-2xl space-y-2">
            <h2 className="text-3xl font-semibold tracking-tight">Everything that decides whether a flip makes money</h2>
            <p className="text-muted-foreground">Built for people who buy damaged cars to fix and resell — from first-timers to dealers and exporters.</p>
          </div>
          <div className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex gap-3">
                <f.Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <h3 className="font-medium">{f.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="scroll-mt-16 border-b">
        <div className="mx-auto max-w-6xl space-y-10 px-4 py-16">
          <div className="mx-auto max-w-2xl space-y-2 text-center">
            <h2 className="text-3xl font-semibold tracking-tight">One bad bid costs more than a year of Pro</h2>
            <p className="text-muted-foreground">Start free. Upgrade when you&apos;re bidding every week.</p>
          </div>
          <PricingTable />
        </div>
      </section>

      <section id="faq" className="scroll-mt-16 border-b">
        <div className="mx-auto max-w-3xl space-y-8 px-4 py-16">
          <h2 className="text-3xl font-semibold tracking-tight">Questions</h2>
          <div className="divide-y rounded-xl border">
            {FAQ.map((f) => (
              <details key={f.q} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                  {f.q}
                  <span aria-hidden="true" className="text-muted-foreground transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 py-20 text-center">
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance">Your next lot closes soon. Know your number first.</h2>
          <Button asChild size="lg">
            <Link href="/app">
              Analyze a lot <ArrowRightIcon />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
