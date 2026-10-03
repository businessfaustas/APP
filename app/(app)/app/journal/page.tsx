import type { Metadata } from "next";

import { JournalClient, type JournalDraft, type JournalEntryView } from "@/components/journal/journal-client";
import { PageContainer, PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth/session";
import type { CalculationResult } from "@/lib/calc/types";
import { prisma } from "@/lib/db/prisma";
import type { NormalizedListing } from "@/lib/domain/schemas";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("journal.title") };
}

export default async function JournalPage({ searchParams }: { searchParams: Promise<{ analysisId?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const t = await getT();
  const rows = await prisma.dealJournalEntry.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  const entries: JournalEntryView[] = rows.map((r) => ({
    id: r.id,
    analysisId: r.analysisId,
    vin: r.vin,
    title: r.title,
    purchasedAt: r.purchasedAt?.toISOString() ?? null,
    soldAt: r.soldAt?.toISOString() ?? null,
    notes: r.notes,
    estimatedRepair: r.estimatedRepair,
    estimatedProfit: r.estimatedProfit,
    purchasePrice: r.purchasePrice,
    auctionFeesActual: r.auctionFeesActual,
    transportActual: r.transportActual,
    partsActual: r.partsActual,
    laborActual: r.laborActual,
    otherCostsActual: r.otherCostsActual,
    salePrice: r.salePrice,
  }));

  let prefill: JournalDraft | null = null;
  if (sp.analysisId) {
    const a = await prisma.analysis.findFirst({ where: { id: sp.analysisId, userId: user.id } });
    if (a) {
      const l = a.listingSnapshot as NormalizedListing | null;
      const calc = a.calc as CalculationResult | null;
      prefill = {
        analysisId: a.id,
        vin: l?.vin ?? null,
        title: l ? [l.year, l.make, l.model].filter(Boolean).join(" ") : a.inputValue,
        purchasedAt: new Date().toISOString(),
        soldAt: null,
        notes: null,
        estimatedRepair: calc?.scenarios.expected.repair ?? null,
        estimatedProfit: calc?.scenarios.expected.profitAtMaxBid ?? null,
        purchasePrice: l?.currentBid ?? null,
        auctionFeesActual: null,
        transportActual: null,
        partsActual: null,
        laborActual: null,
        otherCostsActual: null,
        salePrice: null,
      };
    }
  }

  return (
    <PageContainer>
      <PageHeader title={t("journal.title")} description={t("journal.body")} />
      <JournalClient entries={entries} prefill={prefill} />
    </PageContainer>
  );
}
