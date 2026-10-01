import type { Metadata } from "next";

import { ReferencesEditor } from "@/components/admin/references-editor";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/db/prisma";
import type { VehicleClass } from "@/lib/domain/schemas";

export const metadata: Metadata = { title: "Parts & labor" };

export default async function ReferencesPage() {
  const [prices, labor] = await Promise.all([
    prisma.partPriceReference.findMany({ orderBy: [{ partKey: "asc" }, { source: "asc" }] }),
    prisma.laborReference.findMany({ orderBy: { partKey: "asc" } }),
  ]);
  return (
    <div className="space-y-5">
      <PageHeader
        title="Parts & labor references"
        description="The estimator prices parts from this table first (AI estimates fill gaps) and keeps AI labor hours inside these ranges. Calibrate with your real invoices."
      />
      <ReferencesEditor
        prices={prices.map((p) => ({ partKey: p.partKey, vehicleClass: p.vehicleClass as VehicleClass, source: p.source, priceLow: p.priceLow, priceHigh: p.priceHigh, isPlaceholder: p.isPlaceholder }))}
        labor={labor}
      />
    </div>
  );
}
