"use client";

import { useQuery } from "@tanstack/react-query";
import { ClipboardListIcon, SlidersHorizontalIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AnalysisView } from "@/lib/analysis/view";
import { useT } from "@/lib/i18n/client";
import { trText } from "@/lib/i18n/generated";
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
import { WhatIfActions, WhatIfControls, WhatIfHeading } from "./what-if-panel";

export function Disclaimer() {
  const t = useT();
  return (
    <p className="text-muted-foreground text-xs" data-testid="disclaimer">
      {t("report.disclaimer")}
    </p>
  );
}

function MobileBar() {
  const { calc, marketMissing } = useReport();
  const t = useT();
  if (!calc || marketMissing) return null;
  return (
    <div className="bg-background/95 fixed inset-x-0 bottom-[calc(3.6rem+env(safe-area-inset-bottom))] z-20 border-t px-4 py-2 backdrop-blur md:bottom-0 lg:hidden">
      <div className="flex items-center justify-between gap-3">
        <VerdictBadge verdict={calc.verdict} />
        <div className="text-sm">
          {t("report.max")} <span className="num font-semibold">{calc.maxBid !== null ? formatUsd(calc.maxBid) : "—"}</span>
        </div>
        <Drawer>
          <DrawerTrigger asChild>
            <Button size="sm" variant="outline">
              <SlidersHorizontalIcon /> {t("report.whatIf")}
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{t("report.whatIf")}</DrawerTitle>
              <DrawerDescription>
                {t("report.maxBid")}: <span className="text-foreground font-semibold">{calc.maxBid !== null ? formatUsd(calc.maxBid) : "—"}</span> ·{" "}
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
  const t = useT();
  const { view } = useReport();
  return (
    <div className="space-y-6 pb-16 lg:pb-0">
      <ReportHeader />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          <DealCard />
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="gap-5">
              <TabsTrigger value="overview">{t("report.tabOverview")}</TabsTrigger>
              <TabsTrigger value="damage">{t("report.tabDamage")}</TabsTrigger>
              <TabsTrigger value="repair">{t("report.tabRepair")}</TabsTrigger>
              <TabsTrigger value="market">{t("report.tabMarket")}</TabsTrigger>
              <TabsTrigger value="costs">{t("report.tabCosts")}</TabsTrigger>
              <TabsTrigger value="vehicle">{t("report.tabVehicle")}</TabsTrigger>
              <TabsTrigger value="logistics">{t("report.tabLogistics")}</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <OverviewTab onOpenTab={setTab} />
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
          <Card className="sticky top-6 max-h-[calc(100dvh-3rem)] gap-0 overflow-hidden py-0">
            <div className="border-b px-5 py-4">
              <WhatIfHeading />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <WhatIfControls actions={false} />
            </div>
            {!view.readOnly && (
              <div className="bg-card border-t px-5 py-4">
                <WhatIfActions />
              </div>
            )}
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
  const t = useT();
  const { data } = useQuery({
    queryKey: ["analysis", initial.id, resumed],
    queryFn: async () => {
      const res = await fetch(`/api/analyses/${initial.id}`, { cache: "no-store" });
      if (!res.ok) throw new Error(t("report.loadFailed"));
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
            <ClipboardListIcon className="text-stop size-5" /> {t("report.failedTitle")}
          </div>
          <p className="text-muted-foreground text-sm">
            {view.error ? trText(t, view.error) : t("report.unknownError")} {t("report.refunded")}
          </p>
          <Button asChild>
            <Link href="/app">{t("report.tryAgain")}</Link>
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
