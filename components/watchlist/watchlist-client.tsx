"use client";

import { BellIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { VerdictBadge } from "@/components/report/verdict-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { VerdictValue } from "@/lib/calc/types";
import { cn, formatCountdown, formatDateTime, formatUsd, isPast } from "@/lib/utils";

export interface WatchItemView {
  id: string;
  analysisId: string | null;
  title: string;
  source: string;
  lotNumber: string | null;
  sourceUrl: string | null;
  saleDate: string | null;
  currentBid: number | null;
  maxBid: number | null;
  myMaxBid: number | null;
  verdict: VerdictValue | null;
  notes: string | null;
  remindAt: string | null;
  remindedAt: string | null;
  photo: string | null;
}

function Item({ item }: { item: WatchItemView }) {
  const router = useRouter();
  const [myMax, setMyMax] = useState(item.myMaxBid !== null ? String(item.myMaxBid) : "");
  const [notes, setNotes] = useState(item.notes ?? "");
  const ended = isPast(item.saleDate);

  async function save() {
    const res = await fetch("/api/watchlist", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: item.id, notes, myMaxBid: myMax ? Number(myMax.replace(/[^\d]/g, "")) : null }),
    });
    if (res.ok) toast.success("Saved");
    else toast.error("Couldn't save");
  }
  async function remove() {
    await fetch(`/api/watchlist?id=${item.id}`, { method: "DELETE" });
    toast.success("Removed");
    router.refresh();
  }

  return (
    <Card className={cn(ended && "opacity-70")}>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {item.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.photo} alt="" className="h-20 w-full shrink-0 rounded-md object-cover sm:w-32" />
        ) : (
          <div className="hidden h-20 w-32 shrink-0 rounded-md bg-muted sm:block" />
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            {item.analysisId ? (
              <Link href={`/app/analyses/${item.analysisId}`} className="font-semibold hover:underline">
                {item.title}
              </Link>
            ) : (
              <span className="font-semibold">{item.title}</span>
            )}
            {item.verdict && <VerdictBadge verdict={item.verdict} />}
          </div>
          <div className="text-xs text-muted-foreground">
            {item.source} {item.lotNumber ? `lot ${item.lotNumber}` : ""} · {item.saleDate ? `sale ${formatCountdown(item.saleDate)} (${formatDateTime(item.saleDate)})` : "sale date unknown"}
          </div>
          <div className="text-xs text-muted-foreground">
            Current bid {formatUsd(item.currentBid)} · report max {formatUsd(item.maxBid)}
            {item.remindAt && (
              <span className="ml-2 inline-flex items-center gap-1">
                <BellIcon className="size-3" /> {item.remindedAt ? "reminder sent" : `reminder ${formatDateTime(item.remindAt)}`}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-28">
            <label className="text-[11px] text-muted-foreground" htmlFor={`max-${item.id}`}>
              My max bid
            </label>
            <Input id={`max-${item.id}`} inputMode="numeric" value={myMax} onChange={(e) => setMyMax(e.target.value)} onBlur={() => void save()} className="h-8" />
          </div>
          <div className="w-48">
            <label className="text-[11px] text-muted-foreground" htmlFor={`notes-${item.id}`}>
              Notes
            </label>
            <Input id={`notes-${item.id}`} value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => void save()} className="h-8" />
          </div>
          <Button size="icon" variant="ghost" aria-label="Remove from watchlist" onClick={() => void remove()}>
            <Trash2Icon className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function WatchlistClient({ items }: { items: WatchItemView[] }) {
  return (
    <div className="space-y-3">
      {items.map((i) => (
        <Item key={i.id} item={i} />
      ))}
    </div>
  );
}
