"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { auctionFees, validateFeeSchedule } from "@/lib/calc/fees";
import type { FeeSchedule, FeeTier } from "@/lib/calc/types";
import { formatUsd } from "@/lib/utils";

export interface FeeScheduleRow extends FeeSchedule {
  active: boolean;
}

const SAMPLE_BIDS = [400, 1500, 3100, 5500, 9000, 12500, 20000];

function TierTable({ title, tiers, onChange }: { title: string; tiers: FeeTier[]; onChange: (t: FeeTier[]) => void }) {
  const update = (i: number, patch: Partial<FeeTier>) => onChange(tiers.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  const num = (s: string) => (s.trim() === "" ? undefined : Number(s));
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{title}</div>
      <div className="text-muted-foreground grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-1.5 text-[11px]">
        <span>From $</span>
        <span>To $ (blank = ∞)</span>
        <span>Flat fee $</span>
        <span>or % of bid</span>
        <span />
      </div>
      {tiers.map((t, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-1.5">
          <Input className="h-8" inputMode="numeric" value={t.min} onChange={(e) => update(i, { min: Number(e.target.value) || 0 })} aria-label="From" />
          <Input
            className="h-8"
            inputMode="numeric"
            value={t.max ?? ""}
            onChange={(e) => update(i, { max: e.target.value.trim() === "" ? null : Number(e.target.value) })}
            aria-label="To"
          />
          <Input
            className="h-8"
            inputMode="decimal"
            value={t.amount ?? ""}
            onChange={(e) => {
              const amount = num(e.target.value);
              update(i, amount === undefined ? { amount: undefined } : { amount, bps: undefined });
            }}
            aria-label="Flat fee"
          />
          <Input
            className="h-8"
            inputMode="decimal"
            value={t.bps !== undefined ? t.bps / 100 : ""}
            onChange={(e) => {
              const p = num(e.target.value);
              update(i, p === undefined ? { bps: undefined } : { bps: Math.round(p * 100), amount: undefined });
            }}
            aria-label="Percent of bid"
          />
          <Button size="icon" variant="ghost" className="size-8" aria-label="Remove tier" onClick={() => onChange(tiers.filter((_, j) => j !== i))}>
            <Trash2Icon className="size-3.5" />
          </Button>
        </div>
      ))}
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          const last = tiers.at(-1);
          onChange([...tiers.slice(0, -1), ...(last ? [{ ...last, max: last.min + 1000 }] : []), { min: last ? last.min + 1000 : 0, max: null, amount: 0 }]);
        }}
      >
        <PlusIcon /> Add tier
      </Button>
    </div>
  );
}

function ScheduleCard({ initial }: { initial: FeeScheduleRow }) {
  const router = useRouter();
  const [s, setS] = useState<FeeScheduleRow>(initial);
  const [busy, setBusy] = useState(false);
  const validation = useMemo(() => validateFeeSchedule(s), [s]);
  const preview = useMemo(() => (validation.ok ? SAMPLE_BIDS.map((b) => ({ bid: b, fees: auctionFees(s, b).total })) : []), [s, validation.ok]);

  async function save() {
    setBusy(true);
    const res = await fetch("/api/admin/fees", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...s, id: s.id.startsWith("placeholder-") ? undefined : s.id }),
    });
    setBusy(false);
    if (res.ok) {
      toast.success("Fee table saved");
      router.refresh();
    } else toast.error(((await res.json()) as { error?: string }).error ?? "Save failed");
  }

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="text-base">
          {s.source} · {s.buyerType === "LICENSED_DEALER" ? "Licensed dealer" : "Public via broker"}
        </CardTitle>
        <div className="flex gap-1.5">
          {s.isPlaceholder && <Badge variant="caution">Placeholder</Badge>}
          {s.active ? <Badge variant="go">Active</Badge> : <Badge variant="outline">Inactive</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5 sm:col-span-3">
            <Label>Name</Label>
            <Input value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Official source URL</Label>
            <Input value={s.sourceUrl ?? ""} placeholder="https://…" onChange={(e) => setS({ ...s, sourceUrl: e.target.value || null })} />
          </div>
          <div className="space-y-1.5">
            <Label>Verified on</Label>
            <Input type="date" value={s.verifiedAt?.slice(0, 10) ?? ""} onChange={(e) => setS({ ...s, verifiedAt: e.target.value || null })} />
          </div>
          <div className="flex items-center gap-2">
            <Switch id={`ph-${s.id}`} checked={s.isPlaceholder} onCheckedChange={(v) => setS({ ...s, isPlaceholder: v })} />
            <Label htmlFor={`ph-${s.id}`}>Placeholder</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id={`ac-${s.id}`} checked={s.active} onCheckedChange={(v) => setS({ ...s, active: v })} />
            <Label htmlFor={`ac-${s.id}`}>Active</Label>
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <TierTable title="Buyer fee" tiers={s.buyerFeeTiers} onChange={(t) => setS({ ...s, buyerFeeTiers: t })} />
          <TierTable title="Online / virtual bid fee" tiers={s.onlineBidFeeTiers} onChange={(t) => setS({ ...s, onlineBidFeeTiers: t })} />
        </div>
        <div className="space-y-2">
          <div className="text-sm font-medium">Fixed fees</div>
          {s.fixedFees.map((f, i) => (
            <div key={i} className="flex gap-1.5">
              <Input
                className="h-8"
                value={f.label}
                onChange={(e) => setS({ ...s, fixedFees: s.fixedFees.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })}
                aria-label="Fee name"
              />
              <Input
                className="h-8 w-28"
                inputMode="decimal"
                value={f.amount}
                onChange={(e) => setS({ ...s, fixedFees: s.fixedFees.map((x, j) => (j === i ? { ...x, amount: Number(e.target.value) || 0 } : x)) })}
                aria-label="Amount"
              />
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                aria-label="Remove fee"
                onClick={() => setS({ ...s, fixedFees: s.fixedFees.filter((_, j) => j !== i) })}
              >
                <Trash2Icon className="size-3.5" />
              </Button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => setS({ ...s, fixedFees: [...s.fixedFees, { label: "New fee", amount: 0 }] })}>
            <PlusIcon /> Add fixed fee
          </Button>
        </div>
        {validation.ok ? (
          <div className="flex flex-wrap gap-2 text-xs">
            {preview.map((p) => (
              <span key={p.bid} className="bg-muted rounded-md px-2 py-1">
                {formatUsd(p.bid)} → <b>{formatUsd(p.fees)}</b>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-stop text-sm">{validation.errors.join(" · ")}</p>
        )}
        <Button onClick={() => void save()} disabled={busy || !validation.ok}>
          Save fee table
        </Button>
      </CardContent>
    </Card>
  );
}

export function FeeEditor({ schedules }: { schedules: FeeScheduleRow[] }) {
  return (
    <div className="space-y-4">
      {schedules.map((s) => (
        <ScheduleCard key={s.id} initial={s} />
      ))}
    </div>
  );
}
