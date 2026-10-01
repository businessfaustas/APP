import type { Metadata } from "next";

import { UsersTable } from "@/components/admin/users-table";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage() {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { _count: { select: { analyses: true } } } });
  return (
    <div className="space-y-5">
      <PageHeader title="Users" description={`${users.length} most recent accounts`} />
      <Card>
        <CardContent>
          <UsersTable
            users={users.map((u) => ({
              id: u.id,
              email: u.email,
              name: u.name,
              plan: u.plan,
              role: u.role,
              creditsRemaining: u.creditsRemaining,
              analyses: u._count.analyses,
              createdAt: u.createdAt.toISOString(),
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
