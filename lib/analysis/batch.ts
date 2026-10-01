import "server-only";

import type { CalculationResult } from "@/lib/calc/types";
import { prisma } from "@/lib/db/prisma";
import type { DamageAssessment, NormalizedListing } from "@/lib/domain/schemas";

export interface CompareRow {
  id: string;
  status: string;
  needsInput: boolean;
  progress: number;
  inputValue: string;
  title: string;
  photo: string | null;
  damage: string | null;
  title_: string | null;
  saleDate: string | null;
  currentBid: number | null;
  maxBid: number | null;
  headroomBps: number | null;
  expectedProfit: number | null;
  roiBps: number | null;
  severity: number | null;
  verdict: "GO" | "BE_CAUTIOUS" | "WALK_AWAY" | null;
  dealScore: number | null;
}

export async function getBatchRows(batchId: string, userId: string): Promise<{ name: string | null; createdAt: string; rows: CompareRow[] } | null> {
  const batch = await prisma.batch.findFirst({
    where: { id: batchId, userId },
    include: {
      analyses: {
        orderBy: { createdAt: "asc" },
        include: { listing: { include: { photos: { orderBy: { position: "asc" }, take: 1 } } } },
      },
    },
  });
  if (!batch) return null;
  const rows: CompareRow[] = batch.analyses.map((a) => {
    const l = a.listingSnapshot as NormalizedListing | null;
    const calc = a.calc as CalculationResult | null;
    const d = a.damage as DamageAssessment | null;
    const p = a.listing?.photos[0];
    const photo = p ? (p.originalUrl?.startsWith("/demo-photos/") ? p.originalUrl : p.storagePath ? `/api/photos/${p.id}` : null) : null;
    return {
      id: a.id,
      status: a.status,
      needsInput: a.currentStep === "NEEDS_INPUT",
      progress: a.progress,
      inputValue: a.inputValue,
      title: l ? [l.year, l.make, l.model].filter(Boolean).join(" ") || a.inputValue : a.inputValue,
      photo,
      damage: l?.primaryDamage ?? null,
      title_: l?.titleCategory ?? null,
      saleDate: l?.saleDate ?? null,
      currentBid: l?.currentBid ?? null,
      maxBid: a.maxBid,
      headroomBps: calc?.headroomBps ?? null,
      expectedProfit: a.expectedProfit,
      roiBps: calc?.scenarios.expected.roiAtMaxBidBps ?? null,
      severity: d?.severity_score ?? null,
      verdict: a.verdict,
      dealScore: a.dealScore,
    };
  });
  return { name: batch.name, createdAt: batch.createdAt.toISOString(), rows };
}
