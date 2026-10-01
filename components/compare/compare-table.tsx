"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowDownUpIcon, EyeIcon, Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { VerdictBadge } from "@/components/report/verdict-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CompareRow } from "@/lib/analysis/batch";
import { cn, formatBps, formatCountdown, formatUsd } from "@/lib/utils";

type SortKey = "dealScore" | "maxBid" | "expectedProfit" | "roiBps" | "headroomBps" | "severity" | "saleDate";

const COLS: { key: SortKey; label: string }[] = [
  { key: "saleDate", label: "Sale" },
  { key: "maxBid", label: "Max bid" },
  { key: "headroomBps", label: "Headroom" },
  { key: "expectedProfit", label: "Exp. profit" },
  { key: "roiBps", label: "ROI" },
  { key: "severity", label: "Severity" },
  { key: "dealScore", label: "Score" },
];

function value(r: CompareRow, k: SortKey): number {
  if (k === "saleDate") return r.saleDate ? -new Date(r.saleDate).getTime() : -Infinity;
  if (k === "severity") return r.severity === null ? -Infinity : -r.severity;
  return r[k] ?? -Infinity;
}

export function CompareTable({ batchId, initial }: { batchId: string; initial: CompareRow[] }) {
  const [sort, setSort] = useState<SortKey>("dealScore");
  const [desc, setDesc] = useState(true);
  const { data } = useQuery({
    queryKey: ["batch", batchId],
    queryFn: async () => ((await (await fetch(`/api/batches/${batchId}`, { cache: "no-store" })).json()) as { rows: CompareRow[] }).rows,
    initialData: initial,
    refetchInterval: (q) => ((q.state.data ?? []).some((r) => (r.status === "QUEUED" || r.status === "RUNNING") && !r.needsInput) ? 1500 : false),
  });
  const rows = useMemo(() => {
    const done = (data ?? []).filter((r) => r.status === "COMPLETED");
    const other = (data ?? []).filter((r) => r.status !== "COMPLETED");
    done.sort((a, b) => (desc ? value(b, sort) - value(a, sort) : value(a, sort) - value(b, sort)));
    return [...done, ...other];
  }, [data, sort, desc]);

  async function watch(id: string) {
    const res = await fetch("/api/watchlist", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ analysisId: id }) });
    if (res.ok) toast.success("Added to watchlist");
    else toast.error(((await res.json()) as { error?: string }).error ?? "Failed");
  }

  return (
    <Table data-testid="compare-table">
      <TableHeader>
        <TableRow>
          <TableHead>Vehicle</TableHead>
          <TableHead>Verdict</TableHead>
          {COLS.map((c) => (
            <TableHead key={c.key} className="text-right">
              <button
                type="button"
                className={cn("inline-flex items-center gap-1 hover:text-foreground", sort === c.key && "text-foreground")}
                onClick={() => {
                  if (sort === c.key) setDesc(!desc);
                  else {
                    setSort(c.key);
                    setDesc(true);
                  }
                }}
              >
                {c.label} <ArrowDownUpIcon className="size-3" />
              </button>
            </TableHead>
          ))}
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r, i) => (
          <TableRow key={r.id}>
            <TableCell>
              <Link href={`/app/analyses/${r.id}`} className="flex items-center gap-3">
                {r.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.photo} alt="" className="h-10 w-16 shrink-0 rounded object-cover" />
                ) : (
                  <div className="h-10 w-16 shrink-0 rounded bg-muted" />
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 font-medium">
                    {r.status === "COMPLETED" && i === 0 && sort === "dealScore" && desc && <Badge variant="go">Best</Badge>}
                    <span className="max-w-48 truncate">{r.title}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {[r.damage?.toLowerCase(), r.title_?.toLowerCase().replace(/_/g, " ")].filter(Boolean).join(" · ")}
                  </div>
                </div>
              </Link>
            </TableCell>
            {r.status === "COMPLETED" && r.verdict ? (
              <>
                <TableCell>
                  <VerdictBadge verdict={r.verdict} />
                </TableCell>
                <TableCell className="text-right text-xs">{formatCountdown(r.saleDate)}</TableCell>
                <TableCell className="num text-right font-semibold">{formatUsd(r.maxBid)}</TableCell>
                <TableCell className={cn("num text-right", (r.headroomBps ?? 0) < 1500 && "text-caution")}>{formatBps(r.headroomBps, 0)}</TableCell>
                <TableCell className={cn("num text-right", (r.expectedProfit ?? 0) < 0 && "text-stop")}>{formatUsd(r.expectedProfit)}</TableCell>
                <TableCell className="num text-right">{formatBps(r.roiBps)}</TableCell>
                <TableCell className="num text-right">{r.severity ?? "—"}/10</TableCell>
                <TableCell className="num text-right font-semibold">{r.dealScore ?? "—"}</TableCell>
                <TableCell>
                  <Button size="icon" variant="ghost" className="size-8" aria-label="Add to watchlist" onClick={() => void watch(r.id)}>
                    <EyeIcon className="size-4" />
                  </Button>
                </TableCell>
              </>
            ) : (
              <TableCell colSpan={COLS.length + 2} className="text-sm text-muted-foreground">
                {r.status === "FAILED" ? (
                  <Badge variant="stop">Failed</Badge>
                ) : r.needsInput ? (
                  <Link href={`/app/analyses/${r.id}`} className="underline">
                    Needs listing details — open
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <Loader2Icon className="size-3.5 animate-spin" /> Analyzing… {r.progress}%
                  </span>
                )}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
