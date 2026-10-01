import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { integrationStatus } from "@/lib/config/env";
import { prisma } from "@/lib/db/prisma";
import { daysAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Admin" };

function usd(n: number): string {
  return `$${n.toFixed(n < 1 ? 3 : 2)}`;
}

export default async function AdminOverview() {
  const since = daysAgo(30);
  const [users, analyses, completed30, failed30, usage, byPurpose, placeholderFees] = await Promise.all([
    prisma.user.count(),
    prisma.analysis.count(),
    prisma.analysis.count({ where: { status: "COMPLETED", createdAt: { gte: since } } }),
    prisma.analysis.count({ where: { status: "FAILED", createdAt: { gte: since } } }),
    prisma.$queryRaw<{ day: Date; cost: number; calls: bigint }[]>`
      SELECT date_trunc('day', "createdAt") AS day, SUM("costUsd")::float AS cost, COUNT(*) AS calls
      FROM "AiUsage" WHERE "createdAt" >= ${since} GROUP BY 1 ORDER BY 1 DESC LIMIT 30`,
    prisma.aiUsage.groupBy({
      by: ["purpose"],
      where: { createdAt: { gte: since } },
      _sum: { costUsd: true, inputTokens: true, outputTokens: true },
      _count: true,
    }),
    prisma.feeSchedule.count({ where: { active: true, isPlaceholder: true } }),
  ]);
  const totalCost = byPurpose.reduce((a, p) => a + (p._sum.costUsd ?? 0), 0);
  const tiles = [
    { label: "Users", value: String(users) },
    { label: "Reports (all time)", value: String(analyses) },
    { label: "Completed (30 d)", value: String(completed30), sub: `${failed30} failed` },
    { label: "AI cost (30 d)", value: usd(totalCost), sub: completed30 ? `${usd(totalCost / completed30)} per report` : undefined },
  ];
  return (
    <div className="space-y-5">
      {placeholderFees > 0 && (
        <p className="bg-caution-soft rounded-md px-3 py-2 text-sm">
          {placeholderFees} active fee table(s) are still placeholders. Replace them with the official Copart/IAAI charts under <b>Fee tables</b> before launch.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label}>
            <CardContent>
              <div className="text-muted-foreground text-xs">{t.label}</div>
              <div className="text-2xl font-semibold">{t.value}</div>
              {t.sub && <div className="text-muted-foreground text-xs">{t.sub}</div>}
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">AI usage by purpose (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Purpose</TableHead>
                  <TableHead className="text-right">Calls</TableHead>
                  <TableHead className="text-right">Tokens in / out</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="num">
                {byPurpose.map((p) => (
                  <TableRow key={p.purpose}>
                    <TableCell>{p.purpose.toLowerCase().replace("_", " ")}</TableCell>
                    <TableCell className="text-right">{p._count}</TableCell>
                    <TableCell className="text-right">
                      {(p._sum.inputTokens ?? 0).toLocaleString("en-US")} / {(p._sum.outputTokens ?? 0).toLocaleString("en-US")}
                    </TableCell>
                    <TableCell className="text-right">{usd(p._sum.costUsd ?? 0)}</TableCell>
                  </TableRow>
                ))}
                {byPurpose.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground">
                      No AI calls yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">AI cost per day</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Day</TableHead>
                  <TableHead className="text-right">Calls</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="num">
                {usage.map((u) => (
                  <TableRow key={u.day.toISOString()}>
                    <TableCell>{u.day.toISOString().slice(0, 10)}</TableCell>
                    <TableCell className="text-right">{Number(u.calls)}</TableCell>
                    <TableCell className="text-right">{usd(u.cost)}</TableCell>
                  </TableRow>
                ))}
                {usage.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-muted-foreground">
                      No usage yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Integrations</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-1 text-sm sm:grid-cols-2">
            {integrationStatus().map((i) => (
              <li key={i.key}>
                <span className={i.enabled ? "text-go" : "text-muted-foreground"}>{i.enabled ? "●" : "○"}</span> {i.label}{" "}
                <span className="text-muted-foreground text-xs">— {i.note}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
