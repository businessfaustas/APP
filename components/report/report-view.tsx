"use client";

import { useQuery } from "@tanstack/react-query";
import {
  CarIcon,
  ClipboardListIcon,
  FileWarningIcon,
  LayoutDashboardIcon,
  ReceiptIcon,
  SlidersHorizontalIcon,
  TrendingUpIcon,
  TruckIcon,
  WrenchIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AnalysisView } from "@/lib/analysis/view";
import { formatUsd } from "@/lib/utils";

import { AnalysisProgress, NeedsInputForm } from "./analysis-progress";
import { CostsTab } from "./costs-tab";
import { DamageTab } from "./damage-tab";
import { DealCard } from "./deal-card";
import { MarketTab } from "./market-tab";
import { OverviewTab } from "./overview-tab";
import { RepairTab } from "./repair-tab";
import { ReportHeader } from "./report-header";
import { ReportProvider, useReport } from "./report-context";
import { VerdictBadge } from "./verdict-badge";
import { LogisticsTab, VehicleTab } from "./vehicle-tab";
import { WhatIfControls, WhatIfHeading } from "./what-if-panel";

export function Disclaimer() {
  return (
    <p className="text-muted-foreground text-xs" data-testid="disclaimer">
      Estimates only — not an appraisal, insurance estimate or guarantee. Verify fees, title rules and vehicle condition before bidding. You are responsible for
      your bids.
    </p>
  );
}

function MobileBar() {
  const { calc, marketMissing } = useReport();
  if (!calc || marketMissing) return null;
  return (
    <div className="bg-background/95 fixed inset-x-0 bottom-[calc(3.6rem+env(safe-area-inset-bottom))] z-20 border-t px-4 py-2 backdrop-blur md:bottom-0 lg:hidden">
      <div className="flex items-center justify-between gap-3">
        <VerdictBadge verdict={calc.verdict} />
        <div className="text-sm">
          Max <span className="num font-semibold">{calc.maxBid !== null ? formatUsd(calc.maxBid) : "—"}</span>
        </div>
        <Drawer>
          <DrawerTrigger asChild>
            <Button size="sm" variant="outline">
              <SlidersHorizontalIcon /> What-if
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>What-if</DrawerTitle>
              <DrawerDescription>
                Max bid: <span className="text-foreground font-semibold">{calc.maxBid !== null ? formatUsd(calc.maxBid) : "—"}</span> ·{" "}
                <VerdictBadge verdict={calc.verdict} />
              </DrawerDescription>
            </DrawerHeader>
            <div className="overflow-y-auto px-4 pb-6">
              <WhatIfControls compact />
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  );
}

function CompletedReport() {
  const [tab, setTab] = useState("overview");
  return (
    <div className="space-y-5 pb-16 lg:pb-0">
      <ReportHeader />
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-5">
          <DealCard />
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="overview">
                <LayoutDashboardIcon /> Overview
              </TabsTrigger>
              <TabsTrigger value="damage">
                <FileWarningIcon /> Damage
              </TabsTrigger>
              <TabsTrigger value="repair">
                <WrenchIcon /> Repair
              </TabsTrigger>
              <TabsTrigger value="market">
                <TrendingUpIcon /> Market
              </TabsTrigger>
              <TabsTrigger value="costs">
                <ReceiptIcon /> Costs & profit
              </TabsTrigger>
              <TabsTrigger value="vehicle">
                <CarIcon /> Vehicle
              </TabsTrigger>
              <TabsTrigger value="logistics">
                <TruckIcon /> Logistics
              </TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <OverviewTab />
            </TabsContent>
            <TabsContent value="damage">
              <DamageTab />
            </TabsContent>
            <TabsContent value="repair">
              <RepairTab />
            </TabsContent>
            <TabsContent value="market">
              <MarketTab />
            </TabsContent>
            <TabsContent value="costs">
              <CostsTab />
            </TabsContent>
            <TabsContent value="vehicle">
              <VehicleTab />
            </TabsContent>
            <TabsContent value="logistics">
              <LogisticsTab />
            </TabsContent>
          </Tabs>
          <Disclaimer />
        </div>
        <aside className="hidden lg:block">
          <Card className="sticky top-4 max-h-[calc(100dvh-2rem)] overflow-y-auto">
            <CardContent className="space-y-4">
              <WhatIfHeading />
              <WhatIfControls />
            </CardContent>
          </Card>
        </aside>
      </div>
      <MobileBar />
    </div>
  );
}

function isActive(v: AnalysisView): boolean {
  return (v.status === "QUEUED" || v.status === "RUNNING") && !v.needsInput;
}

/** Polls while the analysis runs, then renders the full interactive report. */
export function ReportView({ initial }: { initial: AnalysisView }) {
  const [resumed, setResumed] = useState(0);
  const { data } = useQuery({
    queryKey: ["analysis", initial.id, resumed],
    queryFn: async () => {
      const res = await fetch(`/api/analyses/${initial.id}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load");
      return (await res.json()) as AnalysisView;
    },
    initialData: resumed === 0 ? initial : undefined,
    refetchInterval: (q) => (q.state.data && !isActive(q.state.data) ? false : 1500),
  });
  const view = data ?? initial;

  if (view.status === "FAILED") {
    return (
      <Card className="mx-auto max-w-xl">
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 font-semibold">
            <ClipboardListIcon className="text-stop size-5" /> The analysis failed
          </div>
          <p className="text-muted-foreground text-sm">{view.error ?? "Unknown error."} Your credit was refunded.</p>
          <Button asChild>
            <Link href="/app">Try again</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }
  if (view.needsInput) return <NeedsInputForm view={view} onResumed={() => setResumed((n) => n + 1)} />;
  if (view.status !== "COMPLETED") return <AnalysisProgress view={view} />;
  return (
    <ReportProvider key={view.id} view={view}>
      <CompletedReport />
    </ReportProvider>
  );
}

/** Read-only report (shared links). */
export function SharedReport({ view }: { view: AnalysisView }) {
  return (
    <ReportProvider view={view}>
      <CompletedReport />
    </ReportProvider>
  );
}
