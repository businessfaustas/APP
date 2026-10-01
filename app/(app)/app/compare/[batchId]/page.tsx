import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CompareTable } from "@/components/compare/compare-table";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getBatchRows } from "@/lib/analysis/batch";
import { requireUser } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Comparison" };

export default async function BatchPage({ params }: { params: Promise<{ batchId: string }> }) {
  const user = await requireUser();
  const { batchId } = await params;
  const data = await getBatchRows(batchId, user.id);
  if (!data) notFound();
  return (
    <PageContainer className="max-w-7xl">
      <PageHeader
        title={data.name ?? `Comparing ${data.rows.length} lots`}
        description={`Started ${formatDateTime(data.createdAt)} · click a column to sort · rows open the full report`}
        actions={
          <Button variant="outline" asChild>
            <Link href="/app/compare">New comparison</Link>
          </Button>
        }
      />
      <Card>
        <CardContent>
          <CompareTable batchId={batchId} initial={data.rows} />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
