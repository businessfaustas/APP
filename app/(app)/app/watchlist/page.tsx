import { EyeIcon } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState, PageContainer, PageHeader } from "@/components/page-header";
import { WatchlistClient, type WatchItemView } from "@/components/watchlist/watchlist-client";
import { requireUser } from "@/lib/auth/session";
import { features } from "@/lib/config/env";
import { prisma } from "@/lib/db/prisma";
import { rich } from "@/lib/i18n/rich";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("watch.title") };
}

export default async function WatchlistPage() {
  const user = await requireUser();
  const t = await getT();
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
        title: [l.year, l.make, l.model].filter(Boolean).join(" ") || t("report.vehicle"),
        source: t(`domain.source.${l.source}`),
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
      <PageHeader title={t("watch.title")} description={features.email() ? t("watch.bodyEmail") : t("watch.bodyNoEmail")} />
      {items.length === 0 ? (
        <EmptyState icon={<EyeIcon />} title={t("watch.empty")}>
          {rich(t("watch.emptyBody"), { watch: <b>{t("report.watch")}</b> })}
        </EmptyState>
      ) : (
        <WatchlistClient items={items} />
      )}
    </PageContainer>
  );
}
