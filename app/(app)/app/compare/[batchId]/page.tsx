import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CompareTable } from "@/components/compare/compare-table";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getBatchRows } from "@/lib/analysis/batch";
import { requireUser } from "@/lib/auth/session";
import { INTL_LOCALE } from "@/lib/i18n/locales";
import { getT } from "@/lib/i18n/server";
import { formatDateTime } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("compare.title") };
}

export default async function BatchPage({ params }: { params: Promise<{ batchId: string }> }) {
  const user = await requireUser();
  const { batchId } = await params;
  const data = await getBatchRows(batchId, user.id);
  if (!data) notFound();
  const t = await getT();
  return (
    <PageContainer className="max-w-7xl">
      <PageHeader
        title={data.name ?? t("compare.comparing", { n: data.rows.length })}
        description={t("compare.started", { date: formatDateTime(data.createdAt, INTL_LOCALE[t.locale]) })}
        actions={
          <Button variant="outline" asChild>
            <Link href="/app/compare">{t("compare.newComparison")}</Link>
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
