import type { Metadata } from "next";
import Link from "next/link";

import { NewBatchForm } from "@/components/compare/new-batch-form";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { DEMO_LOTS } from "@/lib/config/demo";
import { features } from "@/lib/config/env";
import { prisma } from "@/lib/db/prisma";
import { INTL_LOCALE } from "@/lib/i18n/locales";
import { getT } from "@/lib/i18n/server";
import { formatDate } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("compare.title") };
}

export default async function ComparePage() {
  const user = await requireUser();
  const t = await getT();
  const batches = await prisma.batch.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { _count: { select: { analyses: true } } },
  });
  return (
    <PageContainer>
      <PageHeader title={t("compare.title")} description={t("compare.body")} />
      <NewBatchForm demoLots={features.demoMode() ? DEMO_LOTS : []} />
      {batches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("compare.previous")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {batches.map((b) => (
                <li key={b.id}>
                  <Link href={`/app/compare/${b.id}`} className="flex justify-between py-2 hover:opacity-80">
                    <span>{b.name ?? t("compare.comparisonOf", { n: b._count.analyses })}</span>
                    <span className="text-muted-foreground">{formatDate(b.createdAt, INTL_LOCALE[t.locale])}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}
