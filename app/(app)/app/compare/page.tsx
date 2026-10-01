import type { Metadata } from "next";
import Link from "next/link";

import { NewBatchForm } from "@/components/compare/new-batch-form";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { DEMO_LOTS } from "@/lib/config/demo";
import { features } from "@/lib/config/env";
import { prisma } from "@/lib/db/prisma";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Compare lots" };

export default async function ComparePage() {
  const user = await requireUser();
  const batches = await prisma.batch.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { _count: { select: { analyses: true } } },
  });
  return (
    <PageContainer>
      <PageHeader title="Compare lots" description="Analyze up to 10 listings at once and rank them by deal score, max bid or profit." />
      <NewBatchForm demoLots={features.demoMode() ? DEMO_LOTS : []} />
      {batches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Previous comparisons</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {batches.map((b) => (
                <li key={b.id}>
                  <Link href={`/app/compare/${b.id}`} className="flex justify-between py-2 hover:opacity-80">
                    <span>{b.name ?? `Comparison of ${b._count.analyses} lots`}</span>
                    <span className="text-muted-foreground">{formatDate(b.createdAt)}</span>
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
