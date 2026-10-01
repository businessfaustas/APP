import type { Metadata } from "next";

import { FeeEditor, type FeeScheduleRow } from "@/components/admin/fee-editor";
import { PageHeader } from "@/components/page-header";
import type { FeeTier } from "@/lib/calc/types";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = { title: "Fee tables" };

export default async function FeesPage() {
  const rows = await prisma.feeSchedule.findMany({ orderBy: [{ source: "asc" }, { buyerType: "asc" }, { updatedAt: "desc" }] });
  const schedules: FeeScheduleRow[] = rows.map((r) => ({
    id: r.id,
    source: r.source,
    buyerType: r.buyerType,
    name: r.name,
    buyerFeeTiers: r.buyerFeeTiers as unknown as FeeTier[],
    onlineBidFeeTiers: r.onlineBidFeeTiers as unknown as FeeTier[],
    fixedFees: r.fixedFees as unknown as { label: string; amount: number }[],
    isPlaceholder: r.isPlaceholder,
    verifiedAt: r.verifiedAt?.toISOString() ?? null,
    sourceUrl: r.sourceUrl,
    active: r.active,
  }));
  return (
    <div className="space-y-5">
      <PageHeader
        title="Auction fee tables"
        description="Copy the current official Copart and IAAI buyer-fee charts here (they differ by buyer type, payment method and vehicle type). Fees must never decrease as the bid rises."
      />
      <FeeEditor schedules={schedules} />
    </div>
  );
}
