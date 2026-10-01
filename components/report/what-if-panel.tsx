"use client";

import { RotateCcwIcon, SaveIcon, SlidersHorizontalIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SegmentedControl, Separator } from "@/components/ui/misc";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type { Assumptions } from "@/lib/calc/build";
import { cn, formatUsd } from "@/lib/utils";

import { useReport } from "./report-context";

export function SliderRow({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
  testId,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
  testId?: string;
}) {
  const id = `wi-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className="text-xs font-normal text-muted-foreground">
          {label}
        </Label>
        <span className="num text-sm font-medium" data-testid={testId ? `${testId}-value` : undefined}>
          {format(value)}
        </span>
      </div>
      <Slider
        id={id}
        aria-label={label}
        data-testid={testId}
        value={[Math.min(max, Math.max(min, value))]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(v[0] ?? value)}
      />
    </div>
  );
}

/** Number input that commits on blur/Enter (empty = null when nullable). */
export function MoneyInput({
  label,
  value,
  placeholder,
  onCommit,
  testId,
}: {
  label: string;
  value: number | null;
  placeholder?: string;
  onCommit: (v: number | null) => void;
  testId?: string;
}) {
  const [text, setText] = useState(value === null ? "" : String(value));
  // Re-sync the draft when the committed value changes (adjust state during render).
  const [synced, setSynced] = useState(value);
  if (synced !== value) {
    setSynced(value);
    setText(value === null ? "" : String(value));
  }
  const commit = () => {
    const digits = text.replace(/[^\d]/g, "");
    onCommit(digits === "" ? null : Number(digits));
  };
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-normal text-muted-foreground">{label}</Label>
      <Input
        inputMode="numeric"
        value={text}
        placeholder={placeholder}
        data-testid={testId}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
        }}
        className="h-8"
      />
    </div>
  );
}

const pct = (bps: number) => `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 1)}%`;

export function WhatIfControls({ compact = false }: { compact?: boolean }) {
  const { assumptions: a, setAssumption, view, reset, save, saveDefaults, dirty, saving } = useReport();
  const set = <K extends keyof Assumptions>(k: K) => (v: Assumptions[K]) => setAssumption(k, v);
  const readOnly = view.readOnly;
  const exportAvailable = Boolean(view.base?.exportProfile);
  return (
    <div className={cn("space-y-5", compact && "space-y-4")}>
      <SliderRow label="Labor rate" value={a.laborRate} min={40} max={150} step={5} format={(v) => `$${v}/h`} onChange={set("laborRate")} testId="labor-rate" />
      <SliderRow label="Paint materials" value={a.paintMaterialsPerHour} min={20} max={80} step={5} format={(v) => `$${v}/paint h`} onChange={set("paintMaterialsPerHour")} />
      <div className="space-y-2">
        <Label className="text-xs font-normal text-muted-foreground">Parts source</Label>
        <SegmentedControl
          ariaLabel="Preferred parts source"
          value={a.partsSourcePreference}
          onValueChange={set("partsSourcePreference")}
          options={[
            { value: "OEM_NEW", label: "OEM" },
            { value: "AFTERMARKET", label: "Aftermarket" },
            { value: "USED", label: "Used" },
          ]}
        />
      </div>
      <SliderRow label="Parts discount" value={a.partsDiscountBps} min={0} max={4000} step={100} format={pct} onChange={set("partsDiscountBps")} />
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="wi-cont" className="text-xs font-normal text-muted-foreground">
            Override contingency
          </Label>
          <Switch
            id="wi-cont"
            checked={a.contingencyOverrideBps !== null}
            onCheckedChange={(on) => setAssumption("contingencyOverrideBps", on ? (view.repair?.baseContingencyBps ?? 1500) : null)}
          />
        </div>
        {a.contingencyOverrideBps !== null && (
          <SliderRow label="Contingency (expected case)" value={a.contingencyOverrideBps} min={0} max={5000} step={100} format={pct} onChange={(v) => setAssumption("contingencyOverrideBps", v)} />
        )}
      </div>
      <Separator />
      <SliderRow label="Target profit (% of resale)" value={a.targetProfitBps} min={0} max={4000} step={100} format={pct} onChange={set("targetProfitBps")} />
      <SliderRow label="Minimum profit" value={a.targetProfitMin} min={0} max={10000} step={250} format={(v) => formatUsd(v)} onChange={set("targetProfitMin")} testId="profit-min" />
      <SliderRow label="Rebuilt-title value (× clean)" value={a.rebuiltFactorBps} min={5000} max={10000} step={100} format={pct} onChange={set("rebuiltFactorBps")} />
      <MoneyInput
        label="Clean market value override (expected)"
        value={a.mvCleanOverride}
        placeholder={view.base ? formatUsd(view.base.mvClean.expected) : ""}
        onCommit={set("mvCleanOverride")}
      />
      <Separator />
      <SliderRow label="Transport" value={a.transportCentsPerMile} min={50} max={400} step={5} format={(v) => `$${(v / 100).toFixed(2)}/mi`} onChange={set("transportCentsPerMile")} />
      <div className="grid grid-cols-2 gap-3">
        <MoneyInput label="Distance (mi)" value={a.distanceOverride} placeholder={String(view.base?.distanceMiles ?? "")} onCommit={set("distanceOverride")} />
        <MoneyInput label="Current bid" value={a.currentBidOverride} placeholder={view.base?.currentBid !== null && view.base?.currentBid !== undefined ? String(view.base.currentBid) : "—"} onCommit={set("currentBidOverride")} />
      </div>
      <SliderRow label="Holding time" value={a.holdingDaysExpected} min={0} max={120} step={5} format={(v) => `${v} days`} onChange={set("holdingDaysExpected")} />
      <div className="space-y-2">
        <Label className="text-xs font-normal text-muted-foreground">Buyer type</Label>
        <SegmentedControl
          ariaLabel="Buyer type"
          value={a.buyerType}
          onValueChange={set("buyerType")}
          options={[
            { value: "LICENSED_DEALER", label: "Licensed dealer" },
            { value: "PUBLIC_VIA_BROKER", label: "Public (broker)" },
          ]}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <MoneyInput label="Broker fee ($)" value={a.brokerFee} onCommit={(v) => setAssumption("brokerFee", v ?? 0)} />
        <SliderRow label="Sales tax" value={a.salesTaxBps} min={0} max={1200} step={25} format={pct} onChange={set("salesTaxBps")} />
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-normal text-muted-foreground">Exit strategy</Label>
        <SegmentedControl
          ariaLabel="Exit strategy"
          value={a.exitStrategy}
          onValueChange={set("exitStrategy")}
          options={[
            { value: "RETAIL_REBUILT", label: "Retail (rebuilt)" },
            { value: "EXPORT", label: "Export" },
          ]}
        />
        {a.exitStrategy === "EXPORT" &&
          (exportAvailable ? (
            <div className="space-y-3">
              <MoneyInput label="Destination resale value (USD)" value={a.destinationResaleOverride} placeholder="Enter to use export pricing" onCommit={set("destinationResaleOverride")} />
              <div className="flex items-center justify-between">
                <Label htmlFor="wi-vat" className="text-xs font-normal text-muted-foreground">
                  VAT recoverable (VAT-registered)
                </Label>
                <Switch id="wi-vat" checked={a.vatRecoverable} onCheckedChange={set("vatRecoverable")} />
              </div>
              {a.destinationResaleOverride === null && !view.base?.destinationResale && (
                <p className="text-xs text-caution">Enter the destination resale value — until then the retail value is used.</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Choose an export profile in Settings, then re-run the analysis to price export costs.</p>
          ))}
      </div>
      {!readOnly && (
        <div className="sticky bottom-0 -mx-1 flex flex-wrap gap-2 border-t bg-card px-1 pt-3 pb-1">
          <Button size="sm" variant="ghost" onClick={reset} disabled={saving}>
            <RotateCcwIcon /> Reset
          </Button>
          <Button size="sm" variant="outline" onClick={() => void saveDefaults()} disabled={saving}>
            Save as my defaults
          </Button>
          <Button size="sm" onClick={() => void save()} disabled={!dirty || saving}>
            <SaveIcon /> Save to report
          </Button>
        </div>
      )}
    </div>
  );
}

export function WhatIfHeading() {
  return (
    <div className="flex items-center gap-2">
      <SlidersHorizontalIcon className="size-4 text-muted-foreground" />
      <h2 className="font-semibold">What-if</h2>
      <span className="text-xs text-muted-foreground">updates instantly</span>
    </div>
  );
}
