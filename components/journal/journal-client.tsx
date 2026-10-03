"use client";

import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLocale, useT } from "@/lib/i18n/client";
import { INTL_LOCALE } from "@/lib/i18n/locales";
import { dealPnl, journalSummary, type JournalNumbers } from "@/lib/journal";
import { cn, formatBps, formatDate, formatUsd } from "@/lib/utils";

export interface JournalEntryView extends JournalNumbers {
  id: string;
  analysisId: string | null;
  vin: string | null;
  title: string;
  purchasedAt: string | null;
  soldAt: string | null;
  notes: string | null;
}

export type JournalDraft = Omit<JournalEntryView, "id"> & { id?: string };

const MONEY_FIELDS = [
  "purchasePrice",
  "auctionFeesActual",
  "transportActual",
  "partsActual",
  "laborActual",
  "otherCostsActual",
  "salePrice",
  "estimatedRepair",
] as const satisfies readonly (keyof JournalNumbers)[];

function EntryDialog({ draft, onClose }: { draft: JournalDraft; onClose: () => void }) {
  const router = useRouter();
  const t = useT();
  const [d, setD] = useState<JournalDraft>(draft);
  const [busy, setBusy] = useState(false);
  const setMoney = (k: keyof JournalNumbers, v: string) => setD((x) => ({ ...x, [k]: v.trim() === "" ? null : Number(v.replace(/[^\d-]/g, "")) }));

  async function save() {
    setBusy(true);
    const res = await fetch("/api/journal", {
      method: d.id ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(d),
    });
    setBusy(false);
    if (!res.ok) return toast.error(((await res.json()) as { error?: string }).error ?? t("journal.couldNotSave"));
    toast.success(t("common.saved"));
    onClose();
    router.replace("/app/journal");
    router.refresh();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{d.id ? t("journal.edit") : t("journal.log")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="j-title">{t("journal.vehicle")}</Label>
            <Input id="j-title" value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} placeholder="2019 Audi A3" />
          </div>
          {MONEY_FIELDS.map((f) => (
            <div key={f} className="space-y-1.5">
              <Label htmlFor={`j-${f}`}>{t(`journal.${f}`)} ($)</Label>
              <Input id={`j-${f}`} inputMode="numeric" value={d[f] ?? ""} onChange={(e) => setMoney(f, e.target.value)} />
            </div>
          ))}
          <div className="space-y-1.5">
            <Label htmlFor="j-bought">{t("journal.boughtOn")}</Label>
            <Input id="j-bought" type="date" value={d.purchasedAt?.slice(0, 10) ?? ""} onChange={(e) => setD({ ...d, purchasedAt: e.target.value || null })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="j-sold">{t("journal.soldOn")}</Label>
            <Input id="j-sold" type="date" value={d.soldAt?.slice(0, 10) ?? ""} onChange={(e) => setD({ ...d, soldAt: e.target.value || null })} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="j-notes">{t("journal.notes")}</Label>
            <Textarea id="j-notes" rows={2} value={d.notes ?? ""} onChange={(e) => setD({ ...d, notes: e.target.value || null })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={() => void save()} disabled={busy || !d.title.trim()}>
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const EMPTY: JournalDraft = {
  analysisId: null,
  vin: null,
  title: "",
  purchasedAt: null,
  soldAt: null,
  notes: null,
  estimatedRepair: null,
  estimatedProfit: null,
  purchasePrice: null,
  auctionFeesActual: null,
  transportActual: null,
  partsActual: null,
  laborActual: null,
  otherCostsActual: null,
  salePrice: null,
};

export function JournalClient({ entries, prefill }: { entries: JournalEntryView[]; prefill: JournalDraft | null }) {
  const router = useRouter();
  const t = useT();
  const intl = INTL_LOCALE[useLocale()];
  const [editing, setEditing] = useState<JournalDraft | null>(prefill);
  const summary = journalSummary(entries);
  const chart = entries
    .map((e) => ({ name: e.title.slice(0, 18), estimated: e.estimatedRepair, actual: dealPnl(e).actualRepair }))
    .filter((r) => r.estimated !== null && r.actual !== null)
    .slice(0, 12);

  async function remove(id: string) {
    await fetch(`/api/journal?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: t("journal.dealsLogged"), value: String(summary.deals), sub: t("journal.soldN", { n: summary.sold }) },
          { label: t("journal.totalProfit"), value: formatUsd(summary.totalProfit), sub: t("journal.saleMinusCosts") },
          { label: t("journal.avgRoi"), value: formatBps(summary.avgRoiBps), sub: t("journal.onSold") },
          {
            label: t("journal.accuracy"),
            value: summary.medianRepairErrorBps !== null ? `±${formatBps(summary.medianRepairErrorBps, 0)}` : "—",
            sub:
              summary.avgRepairBiasBps !== null
                ? t(summary.avgRepairBiasBps >= 0 ? "journal.ranOver" : "journal.ranUnder", { pct: formatBps(Math.abs(summary.avgRepairBiasBps), 0) })
                : t("journal.medianError"),
          },
        ].map((tile) => (
          <Card key={tile.label}>
            <CardContent>
              <div className="text-muted-foreground text-xs">{tile.label}</div>
              <div className="text-2xl font-semibold">{tile.value}</div>
              <div className="text-muted-foreground text-xs">{tile.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">{t("journal.deals")}</CardTitle>
          <Button size="sm" onClick={() => setEditing(EMPTY)}>
            <PlusIcon /> {t("journal.log")}
          </Button>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("journal.emptyBody")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("journal.vehicle")}</TableHead>
                  <TableHead className="text-right">{t("journal.allIn")}</TableHead>
                  <TableHead className="text-right">{t("journal.sale")}</TableHead>
                  <TableHead className="text-right">{t("journal.profit")}</TableHead>
                  <TableHead className="text-right">{t("journal.roi")}</TableHead>
                  <TableHead className="text-right">{t("journal.repairVsEst")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody className="num">
                {entries.map((e) => {
                  const p = dealPnl(e);
                  return (
                    <TableRow key={e.id}>
                      <TableCell>
                        <div className="font-medium">
                          {e.analysisId ? (
                            <Link className="hover:underline" href={`/app/analyses/${e.analysisId}`}>
                              {e.title}
                            </Link>
                          ) : (
                            e.title
                          )}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {e.soldAt
                            ? t("journal.soldDate", { date: formatDate(e.soldAt, intl) })
                            : e.purchasedAt
                              ? t("journal.boughtDate", { date: formatDate(e.purchasedAt, intl) })
                              : ""}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{formatUsd(p.totalCost)}</TableCell>
                      <TableCell className="text-right">{formatUsd(e.salePrice)}</TableCell>
                      <TableCell className={cn("text-right font-medium", (p.profit ?? 0) < 0 && "text-stop")}>{formatUsd(p.profit)}</TableCell>
                      <TableCell className="text-right">{formatBps(p.roiBps)}</TableCell>
                      <TableCell className={cn("text-right", p.repairErrorBps !== null && Math.abs(p.repairErrorBps) > 2000 && "text-caution")}>
                        {p.repairErrorBps !== null ? `${p.repairErrorBps > 0 ? "+" : ""}${formatBps(p.repairErrorBps, 0)}` : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" className="size-8" aria-label={t("common.edit")} onClick={() => setEditing(e)}>
                          <PencilIcon className="size-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="size-8" aria-label={t("common.delete")} onClick={() => void remove(e.id)}>
                          <Trash2Icon className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {chart.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("journal.chartTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-muted-foreground mb-2 flex gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm" style={{ background: "var(--series-1)" }} /> {t("journal.estimated")}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm" style={{ background: "var(--series-2)" }} /> {t("journal.actual")}
              </span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart} margin={{ top: 4, right: 8, bottom: 4, left: 0 }} barGap={2}>
                  <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={{ stroke: "var(--chart-axis)" }} tickLine={false} />
                  <YAxis
                    tickFormatter={(v: number) => `$${Math.round(v / 1000)}k`}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                    width={44}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--muted)", opacity: 0.5 }}
                    content={({ active, payload, label }) =>
                      active && payload?.length ? (
                        <div className="bg-popover rounded-md border px-3 py-2 text-xs shadow-md">
                          <div className="font-medium">{String(label)}</div>
                          {payload.map((p) => (
                            <div key={String(p.dataKey)}>
                              {p.dataKey === "estimated" ? t("journal.estimated") : t("journal.actual")}: {formatUsd(Number(p.value))}
                            </div>
                          ))}
                        </div>
                      ) : null
                    }
                  />
                  <Bar dataKey="estimated" fill="var(--series-1)" maxBarSize={20} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  <Bar dataKey="actual" fill="var(--series-2)" maxBarSize={20} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
      {editing && <EntryDialog draft={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
