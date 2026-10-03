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
import { useLocale, useT } from "@/lib/i18n/client";
import { countdownLabel } from "@/lib/i18n/labels";
import { INTL_LOCALE } from "@/lib/i18n/locales";
import { cn, formatDateTime, formatUsd, isPast } from "@/lib/utils";

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
  const t = useT();
  const intl = INTL_LOCALE[useLocale()];
  const [myMax, setMyMax] = useState(item.myMaxBid !== null ? String(item.myMaxBid) : "");
  const [notes, setNotes] = useState(item.notes ?? "");
  const ended = isPast(item.saleDate);

  async function save() {
    const res = await fetch("/api/watchlist", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: item.id, notes, myMaxBid: myMax ? Number(myMax.replace(/[^\d]/g, "")) : null }),
    });
    if (res.ok) toast.success(t("common.saved"));
    else toast.error(t("watch.couldNotSave"));
  }
  async function remove() {
    await fetch(`/api/watchlist?id=${item.id}`, { method: "DELETE" });
    toast.success(t("watch.removed"));
    router.refresh();
  }

  return (
    <Card className={cn(ended && "opacity-70")}>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {item.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.photo} alt="" className="h-20 w-full shrink-0 rounded-md object-cover sm:w-32" />
        ) : (
          <div className="bg-muted hidden h-20 w-32 shrink-0 rounded-md sm:block" />
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
          <div className="text-muted-foreground text-xs">
            {item.source} {item.lotNumber ? t("watch.lot", { lot: item.lotNumber }) : ""} ·{" "}
            {item.saleDate ? t("watch.sale", { when: countdownLabel(t, item.saleDate), date: formatDateTime(item.saleDate, intl) }) : t("watch.saleUnknown")}
          </div>
          <div className="text-muted-foreground text-xs">
            {t("watch.bids", { current: formatUsd(item.currentBid), max: formatUsd(item.maxBid) })}
            {item.remindAt && (
              <span className="ml-2 inline-flex items-center gap-1">
                <BellIcon className="size-3" />{" "}
                {item.remindedAt ? t("watch.reminderSent") : t("watch.reminderAt", { date: formatDateTime(item.remindAt, intl) })}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-28">
            <label className="text-muted-foreground text-[11px]" htmlFor={`max-${item.id}`}>
              {t("watch.myMax")}
            </label>
            <Input
              id={`max-${item.id}`}
              inputMode="numeric"
              value={myMax}
              onChange={(e) => setMyMax(e.target.value)}
              onBlur={() => void save()}
              className="h-8"
            />
          </div>
          <div className="w-48">
            <label className="text-muted-foreground text-[11px]" htmlFor={`notes-${item.id}`}>
              {t("watch.notes")}
            </label>
            <Input id={`notes-${item.id}`} value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => void save()} className="h-8" />
          </div>
          <Button size="icon" variant="ghost" aria-label={t("watch.remove")} onClick={() => void remove()}>
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
