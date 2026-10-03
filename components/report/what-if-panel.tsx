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
import { useT } from "@/lib/i18n/client";
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
        <Label htmlFor={id} className="text-muted-foreground text-xs font-normal">
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
      <Label className="text-muted-foreground text-xs font-normal">{label}</Label>
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
  const t = useT();
  const set =
    <K extends keyof Assumptions>(k: K) =>
    (v: Assumptions[K]) =>
      setAssumption(k, v);
  const readOnly = view.readOnly;
  const exportAvailable = Boolean(view.base?.exportProfile);
  return (
    <div className={cn("space-y-5", compact && "space-y-4")}>
      <SliderRow
        label={t("report.laborRate")}
        value={a.laborRate}
        min={40}
        max={150}
        step={5}
        format={(v) => t("report.perHour", { v })}
        onChange={set("laborRate")}
        testId="labor-rate"
      />
      <SliderRow
        label={t("report.paintMaterials")}
        value={a.paintMaterialsPerHour}
        min={20}
        max={80}
        step={5}
        format={(v) => t("report.perPaintHour", { v })}
        onChange={set("paintMaterialsPerHour")}
      />
      <div className="space-y-2">
        <Label className="text-muted-foreground text-xs font-normal">{t("report.partsSource")}</Label>
        <SegmentedControl
          ariaLabel={t("report.partsSourceAria")}
          value={a.partsSourcePreference}
          onValueChange={set("partsSourcePreference")}
          options={[
            { value: "OEM_NEW", label: t("domain.partSource.OEM_NEW") },
            { value: "AFTERMARKET", label: t("domain.partSource.AFTERMARKET") },
            { value: "USED", label: t("domain.partSource.USED") },
          ]}
        />
      </div>
      <SliderRow label={t("report.partsDiscount")} value={a.partsDiscountBps} min={0} max={4000} step={100} format={pct} onChange={set("partsDiscountBps")} />
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="wi-cont" className="text-muted-foreground text-xs font-normal">
            {t("report.overrideContingency")}
          </Label>
          <Switch
            id="wi-cont"
            checked={a.contingencyOverrideBps !== null}
            onCheckedChange={(on) => setAssumption("contingencyOverrideBps", on ? (view.repair?.baseContingencyBps ?? 1500) : null)}
          />
        </div>
        {a.contingencyOverrideBps !== null && (
          <SliderRow
            label={t("report.contingencyExpected")}
            value={a.contingencyOverrideBps}
            min={0}
            max={5000}
            step={100}
            format={pct}
            onChange={(v) => setAssumption("contingencyOverrideBps", v)}
          />
        )}
      </div>
      <Separator />
      <SliderRow label={t("report.targetProfit")} value={a.targetProfitBps} min={0} max={4000} step={100} format={pct} onChange={set("targetProfitBps")} />
      <SliderRow
        label={t("report.minProfit")}
        value={a.targetProfitMin}
        min={0}
        max={10000}
        step={250}
        format={(v) => formatUsd(v)}
        onChange={set("targetProfitMin")}
        testId="profit-min"
      />
      <SliderRow
        label={t("report.rebuiltValue")}
        value={a.rebuiltFactorBps}
        min={5000}
        max={10000}
        step={100}
        format={pct}
        onChange={set("rebuiltFactorBps")}
      />
      <MoneyInput
        label={t("report.mvOverride")}
        value={a.mvCleanOverride}
        placeholder={view.base ? formatUsd(view.base.mvClean.expected) : ""}
        onCommit={set("mvCleanOverride")}
      />
      <Separator />
      <SliderRow
        label={t("report.transport")}
        value={a.transportCentsPerMile}
        min={50}
        max={400}
        step={5}
        format={(v) => t("report.perMile", { v: (v / 100).toFixed(2) })}
        onChange={set("transportCentsPerMile")}
      />
      <div className="grid grid-cols-2 gap-3">
        <MoneyInput
          label={t("report.distanceMi")}
          value={a.distanceOverride}
          placeholder={String(view.base?.distanceMiles ?? "")}
          onCommit={set("distanceOverride")}
        />
        <MoneyInput
          label={t("report.currentBid")}
          value={a.currentBidOverride}
          placeholder={view.base?.currentBid !== null && view.base?.currentBid !== undefined ? String(view.base.currentBid) : "—"}
          onCommit={set("currentBidOverride")}
        />
      </div>
      <SliderRow
        label={t("report.holdingTime")}
        value={a.holdingDaysExpected}
        min={0}
        max={120}
        step={5}
        format={(v) => t("report.days", { n: v })}
        onChange={set("holdingDaysExpected")}
      />
      <div className="space-y-2">
        <Label className="text-muted-foreground text-xs font-normal">{t("report.buyerType")}</Label>
        <SegmentedControl
          ariaLabel={t("report.buyerType")}
          value={a.buyerType}
          onValueChange={set("buyerType")}
          options={[
            { value: "LICENSED_DEALER", label: t("domain.buyerType.LICENSED_DEALER") },
            { value: "PUBLIC_VIA_BROKER", label: t("report.publicBroker") },
          ]}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <MoneyInput label={t("report.brokerFee")} value={a.brokerFee} onCommit={(v) => setAssumption("brokerFee", v ?? 0)} />
        <SliderRow label={t("report.salesTax")} value={a.salesTaxBps} min={0} max={1200} step={25} format={pct} onChange={set("salesTaxBps")} />
      </div>
      <div className="space-y-2">
        <Label className="text-muted-foreground text-xs font-normal">{t("report.exitStrategy")}</Label>
        <SegmentedControl
          ariaLabel={t("report.exitStrategy")}
          value={a.exitStrategy}
          onValueChange={set("exitStrategy")}
          options={[
            { value: "RETAIL_REBUILT", label: t("report.retailRebuilt") },
            { value: "EXPORT", label: t("report.export") },
          ]}
        />
        {a.exitStrategy === "EXPORT" &&
          (exportAvailable ? (
            <div className="space-y-3">
              <MoneyInput
                label={t("report.destinationResale")}
                value={a.destinationResaleOverride}
                placeholder={t("report.destinationPlaceholder")}
                onCommit={set("destinationResaleOverride")}
              />
              <div className="flex items-center justify-between">
                <Label htmlFor="wi-vat" className="text-muted-foreground text-xs font-normal">
                  {t("report.vatRecoverable")}
                </Label>
                <Switch id="wi-vat" checked={a.vatRecoverable} onCheckedChange={set("vatRecoverable")} />
              </div>
              {a.destinationResaleOverride === null && !view.base?.destinationResale && (
                <p className="text-caution text-xs">{t("report.destinationMissing")}</p>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">{t("report.exportProfileMissing")}</p>
          ))}
      </div>
      {!readOnly && (
        <div className="bg-card sticky bottom-0 -mx-1 flex flex-wrap gap-2 border-t px-1 pt-3 pb-1">
          <Button size="sm" variant="ghost" onClick={reset} disabled={saving}>
            <RotateCcwIcon /> {t("common.reset")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => void saveDefaults()} disabled={saving}>
            {t("report.saveDefaults")}
          </Button>
          <Button size="sm" onClick={() => void save()} disabled={!dirty || saving}>
            <SaveIcon /> {t("report.saveToReport")}
          </Button>
        </div>
      )}
    </div>
  );
}

export function WhatIfHeading() {
  const t = useT();
  return (
    <div className="flex items-center gap-2">
      <SlidersHorizontalIcon className="text-muted-foreground size-4" />
      <h2 className="font-semibold">{t("report.whatIf")}</h2>
      <span className="text-muted-foreground text-xs">{t("report.updatesInstantly")}</span>
    </div>
  );
}
