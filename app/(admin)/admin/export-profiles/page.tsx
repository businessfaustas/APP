import type { Metadata } from "next";

import { ExportProfilesEditor } from "@/components/admin/export-profiles-editor";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = { title: "Export profiles" };

export default async function ExportProfilesPage() {
  const profiles = await prisma.exportProfile.findMany({ orderBy: { name: "asc" } });
  return (
    <div className="space-y-5">
      <PageHeader
        title="Export profiles"
        description="Landed-cost settings per destination. Duty is charged on the CIF value (bid + fees + freight + insurance); VAT on CIF + duty. Confirm current rates with a customs broker."
      />
      <ExportProfilesEditor profiles={profiles} />
    </div>
  );
}
