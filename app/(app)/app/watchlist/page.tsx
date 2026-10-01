import { EyeIcon } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState, PageContainer, PageHeader } from "@/components/page-header";
import { WatchlistClient, type WatchItemView } from "@/components/watchlist/watchlist-client";
import { requireUser } from "@/lib/auth/session";
import { features } from "@/lib/config/env";
import { prisma } from "@/lib/db/prisma";
import { sourceLabel } from "@/lib/input/urls";

export const metadata: Metadata = { title: "Watchlist" };

export default async function WatchlistPage() {
  const user = await requireUser();
  const rows = await prisma.watchlistItem.findMany({
    where: { userId: user.id },
    include: { listing: { include: { photos: { orderBy: { position: "asc" }, take: 1 } } } },
  });
  const analyses = await prisma.analysis.findMany({
    where: { id: { in: rows.map((r) => r.analysisId).filter((x): x is string => Boolean(x)) } },
    select: { id: true, verdict: true, maxBid: true },
  });
  const byId = new Map(analyses.map((a) => [a.id, a]));
  const items: WatchItemView[] = rows
    .map((r) => {
      const l = r.listing;
      const p = l.photos[0];
      const a = r.analysisId ? byId.get(r.analysisId) : undefined;
      return {
        id: r.id,
        analysisId: r.analysisId,
        title: [l.year, l.make, l.model].filter(Boolean).join(" ") || "Vehicle",
        source: sourceLabel(l.source),
        lotNumber: l.lotNumber,
        sourceUrl: l.sourceUrl,
        saleDate: l.saleDate?.toISOString() ?? null,
        currentBid: l.currentBid,
        maxBid: a?.maxBid ?? null,
        myMaxBid: r.myMaxBid,
        verdict: a?.verdict ?? null,
        notes: r.notes,
        remindAt: r.remindAt?.toISOString() ?? null,
        remindedAt: r.remindedAt?.toISOString() ?? null,
        photo: p ? (p.originalUrl?.startsWith("/demo-photos/") ? p.originalUrl : p.storagePath ? `/api/photos/${p.id}` : null) : null,
      };
    })
    .sort((a, b) => (a.saleDate ?? "9999").localeCompare(b.saleDate ?? "9999"));

  return (
    <PageContainer>
      <PageHeader
        title="Watchlist"
        description={
          features.email()
            ? "Saved lots, soonest sale first. We email you 2 hours before each sale."
            : "Saved lots, soonest sale first. Email reminders turn on when Resend is configured."
        }
      />
      {items.length === 0 ? (
        <EmptyState icon={<EyeIcon />} title="Nothing saved yet">
          Open a report and press <b>Watch</b> to track a lot&apos;s sale date and your max bid.
        </EmptyState>
      ) : (
        <WatchlistClient items={items} />
      )}
    </PageContainer>
  );
}
