"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/misc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HIDDEN_THRESHOLDS, linePrice } from "@/lib/calc/repair";
import type { PartSource, RepairLineItem } from "@/lib/domain/schemas";
import { useT } from "@/lib/i18n/client";
import { trPart, trText } from "@/lib/i18n/generated";
import type { Translator } from "@/lib/i18n/translate";
import { cn, formatBps, formatUsd } from "@/lib/utils";

import { useReport } from "./report-context";

function CellNumber({
  value,
  onCommit,
  label,
  step = 1,
  disabled,
}: {
  value: number;
  onCommit: (v: number) => void;
  label: string;
  step?: number;
  disabled?: boolean;
}) {
  const [text, setText] = useState(String(value));
  // Re-sync the draft when the committed value changes (adjust state during render).
  const [synced, setSynced] = useState(value);
  if (synced !== value) {
    setSynced(value);
    setText(String(value));
  }
  const commit = () => {
    const n = Number(text.replace(/[^\d.]/g, ""));
    if (Number.isFinite(n) && n !== value) onCommit(step < 1 ? Math.round(n * 10) / 10 : Math.round(n));
    else setText(String(value));
  };
  return (
    <Input
      aria-label={label}
      inputMode="decimal"
      value={text}
      disabled={disabled}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      className="num h-7 w-16 px-2 text-right text-xs"
    />
  );
}

function scenarioNote(t: Translator, l: RepairLineItem): string | null {
  if (l.origin !== "HIDDEN_LIKELY") return null;
  if (l.probability >= HIDDEN_THRESHOLDS.expected) return t("report.expectedWorst");
  if (l.probability >= HIDDEN_THRESHOLDS.worst) return t("report.worstOnly");
  return t("report.notCounted");
}

function AddLine() {
  const { addLine, view } = useReport();
  const t = useT();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [hours, setHours] = useState("");
  if (view.readOnly) return null;
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const p = Math.round(Number(price.replace(/[^\d.]/g, "")) || 0);
        const h = Math.round((Number(hours) || 0) * 10) / 10;
        if (!name.trim()) return;
        addLine({
          id: `u${Date.now().toString(36)}`,
          kind: "PART",
          partKey: null,
          partName: name.trim(),
          zone: "front",
          side: "NA",
          action: p > 0 ? "REPLACE" : "REPAIR",
          origin: "VISIBLE",
          probability: 1,
          confidence: 1,
          photoRefs: [],
          prices: { OEM_NEW: null, AFTERMARKET: { low: p, mid: p, high: p }, USED: null },
          priceOrigin: "USER",
          bodyHours: { low: h, mid: h, high: h },
          paintHours: { low: 0, mid: 0, high: 0 },
          mechHours: { low: 0, mid: 0, high: 0 },
          included: true,
          userEdited: true,
          selectedSource: null,
          priceOverride: null,
          reason: t("report.addedByYou"),
        });
        setName("");
        setPrice("");
        setHours("");
      }}
    >
      <Input
        aria-label={t("report.newPartName")}
        placeholder={t("report.addPartPlaceholder")}
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="h-8 w-56"
      />
      <Input
        aria-label={t("report.price")}
        placeholder={t("report.pricePlaceholder")}
        inputMode="numeric"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        className="h-8 w-24"
      />
      <Input
        aria-label={t("report.laborHours")}
        placeholder={t("report.laborPlaceholder")}
        inputMode="decimal"
        value={hours}
        onChange={(e) => setHours(e.target.value)}
        className="h-8 w-24"
      />
      <Button size="sm" type="submit" variant="outline">
        <PlusIcon /> {t("report.addLine")}
      </Button>
    </form>
  );
}

export function RepairTab() {
  const { view, lineItems, updateLine, removeLine, assumptions, calc } = useReport();
  const t = useT();
  const ro = view.readOnly;
  const pref = assumptions.partsSourcePreference;
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("report.lineItems")}</CardTitle>
          <p className="text-muted-foreground text-xs">{t("report.lineItemsNote")}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Table data-testid="repair-table">
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">
                  <span className="sr-only">{t("report.include")}</span>
                </TableHead>
                <TableHead>{t("report.partService")}</TableHead>
                <TableHead>{t("report.source")}</TableHead>
                <TableHead className="text-right">{t("report.price")}</TableHead>
                <TableHead className="text-right">{t("report.bodyH")}</TableHead>
                <TableHead className="text-right">{t("report.paintH")}</TableHead>
                <TableHead className="text-right">{t("report.mechH")}</TableHead>
                <TableHead className="text-right">{t("report.conf")}</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineItems.map((l) => {
                const available = (["OEM_NEW", "AFTERMARKET", "USED"] as const).filter((s) => l.prices[s]);
                const price = linePrice(l, "expected", pref);
                const note = scenarioNote(t, l);
                const name = trPart(t, l.partName);
                return (
                  <TableRow key={l.id} className={cn(!l.included && "opacity-50")}>
                    <TableCell>
                      <Checkbox
                        aria-label={t("report.includeX", { name })}
                        checked={l.included}
                        disabled={ro}
                        onCheckedChange={(c) => updateLine(l.id, { included: c === true })}
                      />
                    </TableCell>
                    <TableCell className="max-w-56 min-w-40 whitespace-normal">
                      <div className="text-sm font-medium">{name}</div>
                      <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-1 text-[11px]">
                        <span>
                          {t(`report.zone.${l.zone}`)} · {l.kind === "SUBLET" ? t("report.sublet") : t(`report.action.${l.action}`)}
                        </span>
                        {l.origin === "HIDDEN_LIKELY" && <Badge variant="caution">{t("report.likely", { pct: Math.round(l.probability * 100), note })}</Badge>}
                        {l.origin === "RULE" && (
                          <Badge variant="info" title={l.reason ? trText(t, l.reason) : undefined}>
                            {t("report.rule")}
                          </Badge>
                        )}
                        {l.priceOrigin === "AI_ESTIMATE" && <Badge variant="outline">{t("report.aiPrice")}</Badge>}
                        {l.userEdited && <Badge variant="outline">{t("report.edited")}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      {available.length > 1 && !ro ? (
                        <Select
                          value={l.selectedSource ?? "AUTO"}
                          onValueChange={(v) => updateLine(l.id, { selectedSource: v === "AUTO" ? null : (v as PartSource) })}
                        >
                          <SelectTrigger size="sm" className="h-7 w-28 text-xs" aria-label={t("report.sourceFor", { name })}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AUTO">{t("report.auto")}</SelectItem>
                            {available.map((s) => (
                              <SelectItem key={s} value={s}>
                                {t(`domain.partSource.${s}`)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-muted-foreground text-xs">
                          {available.length === 1 ? t(`domain.partSource.${available[0]!}`) : l.kind === "SUBLET" ? t("report.shop") : "—"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <CellNumber label={t("report.priceFor", { name })} value={price} disabled={ro} onCommit={(v) => updateLine(l.id, { priceOverride: v })} />
                    </TableCell>
                    <TableCell className="text-right">
                      <CellNumber
                        label={t("report.bodyHoursFor", { name })}
                        step={0.1}
                        value={l.bodyHours.mid}
                        disabled={ro}
                        onCommit={(v) => updateLine(l.id, { bodyHours: { low: v, mid: v, high: v } })}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <CellNumber
                        label={t("report.paintHoursFor", { name })}
                        step={0.1}
                        value={l.paintHours.mid}
                        disabled={ro}
                        onCommit={(v) => updateLine(l.id, { paintHours: { low: v, mid: v, high: v } })}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <CellNumber
                        label={t("report.mechHoursFor", { name })}
                        step={0.1}
                        value={l.mechHours.mid}
                        disabled={ro}
                        onCommit={(v) => updateLine(l.id, { mechHours: { low: v, mid: v, high: v } })}
                      />
                    </TableCell>
                    <TableCell className="num text-muted-foreground text-right text-xs">{Math.round(l.confidence * 100)}%</TableCell>
                    <TableCell>
                      {l.priceOrigin === "USER" && !ro && (
                        <Button size="icon" variant="ghost" className="size-7" aria-label={t("report.remove", { name })} onClick={() => removeLine(l.id)}>
                          <Trash2Icon className="size-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <AddLine />
        </CardContent>
      </Card>
      {calc && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("report.totalsByScenario")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead />
                  <TableHead className="text-right">{t("domain.scenario.best")}</TableHead>
                  <TableHead className="text-right">{t("domain.scenario.expected")}</TableHead>
                  <TableHead className="text-right">{t("domain.scenario.worst")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="num">
                {(
                  [
                    [t("report.partsAfterDiscount"), "parts"],
                    [t("report.labor"), "labor"],
                    [t("report.paintMaterials"), "paintMaterials"],
                    [t("report.sublets"), "sublets"],
                    [t("report.contingency"), "contingency"],
                  ] as const
                ).map(([label, key]) => (
                  <TableRow key={key}>
                    <TableCell>{label}</TableCell>
                    <TableCell className="text-right">{formatUsd(calc.scenarios.best.repairBreakdown[key])}</TableCell>
                    <TableCell className="text-right">{formatUsd(calc.scenarios.expected.repairBreakdown[key])}</TableCell>
                    <TableCell className="text-right">{formatUsd(calc.scenarios.worst.repairBreakdown[key])}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-semibold">
                  <TableCell>{t("report.totalRepair")}</TableCell>
                  <TableCell className="text-right">{formatUsd(calc.scenarios.best.repair)}</TableCell>
                  <TableCell className="text-right" data-testid="repair-expected">
                    {formatUsd(calc.scenarios.expected.repair)}
                  </TableCell>
                  <TableCell className="text-right">{formatUsd(calc.scenarios.worst.repair)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <p className="text-muted-foreground mt-2 text-xs">
              {t("report.repairNote", {
                rate: assumptions.laborRate,
                paint: assumptions.paintMaterialsPerHour,
                cont: formatBps(assumptions.contingencyOverrideBps ?? view.repair?.baseContingencyBps ?? 0, 0),
              })}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
