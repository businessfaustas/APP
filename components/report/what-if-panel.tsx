"use client";

import { RotateCcwIcon, SaveIcon, SlidersHorizontalIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Disclosure, SegmentedControl } from "@/components/ui/misc";
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

/** Max bid after the what-if changes, next to the one from the original analysis. */
function LiveResult() {
  const { calc, view, marketMissing } = useReport();
  const t = useT();
  if (!calc || marketMissing) return null;
  const original = view.calc?.maxBid ?? null;
  const delta = calc.maxBid !== null && original !== null ? calc.maxBid - original : 0;
  return (
    <div className="bg-surface-2 flex items-center justify-between gap-3 rounded-xl border px-4 py-3">
      <div>
        <div className="eyebrow">{t("report.maxBid")}</div>
        <div className="num text-xl font-semibold tracking-tight">{formatUsd(calc.maxBid)}</div>
      </div>
      <div className="text-right">
        {delta !== 0 ? (
          <>
            <div className={cn("num text-sm font-semibold", delta > 0 ? "text-go" : "text-stop")}>
              {delta > 0 ? "+" : "−"}
              {formatUsd(Math.abs(delta))}
            </div>
            <div className="text-muted-foreground text-xs">{t("report.vsOriginal")}</div>
          </>
        ) : (
          <div className="text-muted-foreground text-xs">{t("report.asAnalyzed")}</div>
        )}
      </div>
    </div>
  );
}

function Section({ title, open, children }: { title: string; open?: boolean; children: React.ReactNode }) {
  return (
    <Disclosure title={<span className="font-semibold">{title}</span>} defaultOpen={open} className="border-t pt-2 first:border-t-0 first:pt-0">
      <div className="space-y-5 pt-1 pb-2">{children}</div>
    </Disclosure>
  );
}

/** Save / reset buttons for the what-if changes. */
export function WhatIfActions() {
  const { view, reset, save, saveDefaults, dirty, saving } = useReport();
  const t = useT();
  if (view.readOnly) return null;
  return (
    <div className="space-y-2">
      <Button className="w-full" onClick={() => void save()} disabled={!dirty || saving}>
        <SaveIcon /> {t("report.saveToReport")}
      </Button>
      <Button size="sm" variant="outline" className="w-full" onClick={() => void saveDefaults()} disabled={saving}>
        {t("report.saveDefaults")}
      </Button>
      <Button size="sm" variant="ghost" className="text-muted-foreground w-full" onClick={reset} disabled={saving}>
        <RotateCcwIcon /> {t("common.reset")}
      </Button>
    </div>
  );
}

export function WhatIfControls({ compact = false, actions = true }: { compact?: boolean; actions?: boolean }) {
  const { assumptions: a, setAssumption, view } = useReport();
  const t = useT();
  const set =
    <K extends keyof Assumptions>(k: K) =>
    (v: Assumptions[K]) =>
      setAssumption(k, v);
  const exportAvailable = Boolean(view.base?.exportProfile);
  return (
    <div className="space-y-4">
      {!compact && <LiveResult />}
      <div className="space-y-1">
        <Section title={t("report.secRepair")} open>
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
          <SliderRow
            label={t("report.partsDiscount")}
            value={a.partsDiscountBps}
            min={0}
            max={4000}
            step={100}
            format={pct}
            onChange={set("partsDiscountBps")}
          />
          <div className="space-y-3">
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
        </Section>
        <Section title={t("report.secProfit")} open={!compact}>
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
            placeholder={view.base && view.base.mvClean.expected > 0 ? formatUsd(view.base.mvClean.expected) : t("report.mvPlaceholder")}
            onCommit={set("mvCleanOverride")}
          />
        </Section>
        <Section title={t("report.secPurchase")}>
          <div className="grid grid-cols-2 gap-3">
            <MoneyInput
              label={t("report.currentBid")}
              value={a.currentBidOverride}
              placeholder={view.base?.currentBid !== null && view.base?.currentBid !== undefined ? String(view.base.currentBid) : "—"}
              onCommit={set("currentBidOverride")}
            />
            <MoneyInput
              label={t("report.distanceMi")}
              value={a.distanceOverride}
              placeholder={String(view.base?.distanceMiles ?? "")}
              onCommit={set("distanceOverride")}
            />
          </div>
          <SliderRow
            label={t("report.transport")}
            value={a.transportCentsPerMile}
            min={50}
            max={400}
            step={5}
            format={(v) => t("report.perMile", { v: (v / 100).toFixed(2) })}
            onChange={set("transportCentsPerMile")}
          />
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
        </Section>
        <Section title={t("report.exitStrategy")}>
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
        </Section>
      </div>
      {actions && (
        <div className="border-t pt-4">
          <WhatIfActions />
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
