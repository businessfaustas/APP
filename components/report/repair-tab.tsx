"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/misc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HIDDEN_THRESHOLDS, linePrice } from "@/lib/calc/repair";
import { ZONE_LABELS } from "@/lib/domain/damageZones";
import type { PartSource, RepairLineItem } from "@/lib/domain/schemas";
import { cn, formatBps, formatUsd } from "@/lib/utils";

import { useReport } from "./report-context";

const SOURCE_LABEL: Record<PartSource, string> = { OEM_NEW: "OEM", AFTERMARKET: "Aftermarket", USED: "Used" };

function CellNumber({ value, onCommit, label, step = 1, disabled }: { value: number; onCommit: (v: number) => void; label: string; step?: number; disabled?: boolean }) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
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

function scenarioNote(l: RepairLineItem): string | null {
  if (l.origin !== "HIDDEN_LIKELY") return null;
  if (l.probability >= HIDDEN_THRESHOLDS.expected) return "expected + worst";
  if (l.probability >= HIDDEN_THRESHOLDS.worst) return "worst case only";
  return "not counted";
}

function AddLine() {
  const { addLine, view } = useReport();
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
          reason: "Added by you",
        });
        setName("");
        setPrice("");
        setHours("");
      }}
    >
      <Input aria-label="New part name" placeholder="Add a part or service…" value={name} onChange={(e) => setName(e.target.value)} className="h-8 w-56" />
      <Input aria-label="Price" placeholder="Price $" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} className="h-8 w-24" />
      <Input aria-label="Labor hours" placeholder="Labor h" inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value)} className="h-8 w-24" />
      <Button size="sm" type="submit" variant="outline">
        <PlusIcon /> Add line
      </Button>
    </form>
  );
}

export function RepairTab() {
  const { view, lineItems, updateLine, removeLine, assumptions, calc } = useReport();
  const ro = view.readOnly;
  const pref = assumptions.partsSourcePreference;
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Repair line items</CardTitle>
          <p className="text-xs text-muted-foreground">
            Prices and hours shown are the expected case. Edit any cell — the max bid updates instantly. Hidden-damage lines count only in the scenarios shown.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Table data-testid="repair-table">
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">
                  <span className="sr-only">Include</span>
                </TableHead>
                <TableHead>Part / service</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Body h</TableHead>
                <TableHead className="text-right">Paint h</TableHead>
                <TableHead className="text-right">Mech h</TableHead>
                <TableHead className="text-right">Conf.</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineItems.map((l) => {
                const available = (["OEM_NEW", "AFTERMARKET", "USED"] as const).filter((s) => l.prices[s]);
                const price = linePrice(l, "expected", pref);
                const note = scenarioNote(l);
                return (
                  <TableRow key={l.id} className={cn(!l.included && "opacity-50")}>
                    <TableCell>
                      <Checkbox aria-label={`Include ${l.partName}`} checked={l.included} disabled={ro} onCheckedChange={(c) => updateLine(l.id, { included: c === true })} />
                    </TableCell>
                    <TableCell className="max-w-56 min-w-40 whitespace-normal">
                      <div className="text-sm font-medium">{l.partName}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                        <span>
                          {ZONE_LABELS[l.zone]} · {l.kind === "SUBLET" ? "sublet" : l.action.toLowerCase()}
                        </span>
                        {l.origin === "HIDDEN_LIKELY" && <Badge variant="caution">{Math.round(l.probability * 100)}% likely · {note}</Badge>}
                        {l.origin === "RULE" && <Badge variant="info">rule</Badge>}
                        {l.priceOrigin === "AI_ESTIMATE" && <Badge variant="outline">AI price</Badge>}
                        {l.userEdited && <Badge variant="outline">edited</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      {available.length > 1 && !ro ? (
                        <Select value={l.selectedSource ?? "AUTO"} onValueChange={(v) => updateLine(l.id, { selectedSource: v === "AUTO" ? null : (v as PartSource) })}>
                          <SelectTrigger size="sm" className="h-7 w-28 text-xs" aria-label={`Source for ${l.partName}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AUTO">Auto</SelectItem>
                            {available.map((s) => (
                              <SelectItem key={s} value={s}>
                                {SOURCE_LABEL[s]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-xs text-muted-foreground">{available.length === 1 ? SOURCE_LABEL[available[0]!] : l.kind === "SUBLET" ? "Shop" : "—"}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <CellNumber label={`Price for ${l.partName}`} value={price} disabled={ro} onCommit={(v) => updateLine(l.id, { priceOverride: v })} />
                    </TableCell>
                    <TableCell className="text-right">
                      <CellNumber label={`Body hours for ${l.partName}`} step={0.1} value={l.bodyHours.mid} disabled={ro} onCommit={(v) => updateLine(l.id, { bodyHours: { low: v, mid: v, high: v } })} />
                    </TableCell>
                    <TableCell className="text-right">
                      <CellNumber label={`Paint hours for ${l.partName}`} step={0.1} value={l.paintHours.mid} disabled={ro} onCommit={(v) => updateLine(l.id, { paintHours: { low: v, mid: v, high: v } })} />
                    </TableCell>
                    <TableCell className="text-right">
                      <CellNumber label={`Mechanical hours for ${l.partName}`} step={0.1} value={l.mechHours.mid} disabled={ro} onCommit={(v) => updateLine(l.id, { mechHours: { low: v, mid: v, high: v } })} />
                    </TableCell>
                    <TableCell className="num text-right text-xs text-muted-foreground">{Math.round(l.confidence * 100)}%</TableCell>
                    <TableCell>
                      {l.priceOrigin === "USER" && !ro && (
                        <Button size="icon" variant="ghost" className="size-7" aria-label={`Remove ${l.partName}`} onClick={() => removeLine(l.id)}>
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
            <CardTitle className="text-base">Repair totals by scenario</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead />
                  <TableHead className="text-right">Best</TableHead>
                  <TableHead className="text-right">Expected</TableHead>
                  <TableHead className="text-right">Worst</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="num">
                {(
                  [
                    ["Parts (after discount)", "parts"],
                    ["Labor", "labor"],
                    ["Paint materials", "paintMaterials"],
                    ["Sublets", "sublets"],
                    ["Contingency", "contingency"],
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
                  <TableCell>Total repair</TableCell>
                  <TableCell className="text-right">{formatUsd(calc.scenarios.best.repair)}</TableCell>
                  <TableCell className="text-right" data-testid="repair-expected">
                    {formatUsd(calc.scenarios.expected.repair)}
                  </TableCell>
                  <TableCell className="text-right">{formatUsd(calc.scenarios.worst.repair)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <p className="mt-2 text-xs text-muted-foreground">
              Labor at ${assumptions.laborRate}/h · paint materials ${assumptions.paintMaterialsPerHour}/paint hour · contingency{" "}
              {formatBps(assumptions.contingencyOverrideBps ?? view.repair?.baseContingencyBps ?? 0, 0)} expected (−5 pts best, +10 pts worst).
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
