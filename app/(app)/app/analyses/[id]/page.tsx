import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageContainer } from "@/components/page-header";
import { ReportView } from "@/components/report/report-view";
import { getAnalysisView } from "@/lib/analysis/view";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Report" };

export default async function AnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const view = await getAnalysisView(id, { userId: user.id });
  if (!view) notFound();
  return (
    <PageContainer className="max-w-7xl">
      <ReportView initial={view} />
    </PageContainer>
  );
}
