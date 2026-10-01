"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VEHICLE_CLASSES, type PartSource, type VehicleClass } from "@/lib/domain/schemas";
import { VEHICLE_CLASS_LABELS } from "@/lib/domain/vehicleClass";

export interface PriceRefRow {
  partKey: string;
  vehicleClass: VehicleClass;
  source: PartSource;
  priceLow: number;
  priceHigh: number;
  isPlaceholder: boolean;
}

export interface LaborRefRow {
  partKey: string;
  displayName: string;
  zone: string;
  category: string;
  bodyHoursLow: number;
  bodyHoursHigh: number;
  paintHoursLow: number;
  paintHoursHigh: number;
  mechHoursLow: number;
  mechHoursHigh: number;
}

async function put(body: unknown): Promise<boolean> {
  const res = await fetch("/api/admin/references", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) toast.error(((await res.json()) as { error?: string }).error ?? "Save failed");
  return res.ok;
}

function PricesTab({ rows }: { rows: PriceRefRow[] }) {
  const router = useRouter();
  const [cls, setCls] = useState<VehicleClass>("mainstream");
  const [edits, setEdits] = useState<Record<string, { priceLow: number; priceHigh: number }>>({});
  const [csv, setCsv] = useState("");
  const visible = useMemo(() => rows.filter((r) => r.vehicleClass === cls), [rows, cls]);
  const key = (r: PriceRefRow) => `${r.partKey}:${r.vehicleClass}:${r.source}`;

  async function saveEdits() {
    const changed = rows.filter((r) => edits[key(r)]).map((r) => ({ partKey: r.partKey, vehicleClass: r.vehicleClass, source: r.source, ...edits[key(r)]! }));
    if (changed.length === 0) return;
    if (await put({ kind: "prices", rows: changed })) {
      toast.success(`Saved ${changed.length} price${changed.length > 1 ? "s" : ""}`);
      setEdits({});
      router.refresh();
    }
  }

  async function importCsv() {
    const parsed = csv
      .split(/\n+/)
      .map((l) => l.trim())
      .filter((l) => l && !/^partKey/i.test(l))
      .map((l) => {
        const [partKey, vehicleClass, source, low, high] = l.split(/[,;\t]/).map((x) => x.trim());
        return { partKey, vehicleClass, source, priceLow: Number(low), priceHigh: Number(high) };
      });
    if (await put({ kind: "prices", rows: parsed })) {
      toast.success(`Imported ${parsed.length} rows`);
      setCsv("");
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Parts price ranges</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={cls} onValueChange={(v) => setCls(v as VehicleClass)}>
              <SelectTrigger size="sm" className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VEHICLE_CLASSES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {VEHICLE_CLASS_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => void saveEdits()} disabled={Object.keys(edits).length === 0}>
              Save {Object.keys(edits).length || ""} changes
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Part key</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Low $</TableHead>
                <TableHead className="text-right">High $</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((r) => {
                const e = edits[key(r)] ?? { priceLow: r.priceLow, priceHigh: r.priceHigh };
                return (
                  <TableRow key={key(r)}>
                    <TableCell className="font-mono text-xs">{r.partKey}</TableCell>
                    <TableCell className="text-xs">{r.source.replace("_", " ").toLowerCase()}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        className="num ml-auto h-7 w-24 text-right text-xs"
                        inputMode="numeric"
                        value={e.priceLow}
                        onChange={(ev) => setEdits({ ...edits, [key(r)]: { ...e, priceLow: Number(ev.target.value) || 0 } })}
                        aria-label="Low price"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        className="num ml-auto h-7 w-24 text-right text-xs"
                        inputMode="numeric"
                        value={e.priceHigh}
                        onChange={(ev) => setEdits({ ...edits, [key(r)]: { ...e, priceHigh: Number(ev.target.value) || 0 } })}
                        aria-label="High price"
                      />
                    </TableCell>
                    <TableCell>{r.isPlaceholder && <Badge variant="outline">placeholder</Badge>}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Import CSV</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-muted-foreground text-xs">
            Columns: <code>partKey,vehicleClass,source,low,high</code> — e.g. <code>front_bumper_cover,premium,AFTERMARKET,280,420</code>. Classes:{" "}
            {VEHICLE_CLASSES.join(", ")}. Sources: OEM_NEW, AFTERMARKET, USED.
          </p>
          <Textarea rows={5} value={csv} onChange={(e) => setCsv(e.target.value)} className="font-mono text-xs" />
          <Button size="sm" variant="outline" onClick={() => void importCsv()} disabled={!csv.trim()}>
            Import
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function LaborTab({ rows }: { rows: LaborRefRow[] }) {
  const router = useRouter();
  const [data, setData] = useState(rows);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const fields = ["bodyHoursLow", "bodyHoursHigh", "paintHoursLow", "paintHoursHigh", "mechHoursLow", "mechHoursHigh"] as const;
  async function save() {
    const changed = data.filter((r) => dirty.has(r.partKey));
    if (await put({ kind: "labor", rows: changed })) {
      toast.success("Labor times saved");
      setDirty(new Set());
      router.refresh();
    }
  }
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">Labor time ranges (hours)</CardTitle>
        <Button size="sm" onClick={() => void save()} disabled={dirty.size === 0}>
          Save {dirty.size || ""} changes
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Part</TableHead>
              <TableHead className="text-right">Body</TableHead>
              <TableHead className="text-right">Paint</TableHead>
              <TableHead className="text-right">Mech</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((r) => (
              <TableRow key={r.partKey}>
                <TableCell>
                  <div className="text-sm">{r.displayName}</div>
                  <div className="text-muted-foreground font-mono text-[11px]">{r.partKey}</div>
                </TableCell>
                {[0, 2, 4].map((i) => (
                  <TableCell key={i} className="text-right">
                    <div className="flex justify-end gap-1">
                      {[fields[i]!, fields[i + 1]!].map((f) => (
                        <Input
                          key={f}
                          aria-label={f}
                          inputMode="decimal"
                          className="num h-7 w-14 px-1.5 text-right text-xs"
                          value={r[f]}
                          onChange={(e) => {
                            const v = Number(e.target.value) || 0;
                            setData((d) => d.map((x) => (x.partKey === r.partKey ? { ...x, [f]: v } : x)));
                            setDirty((s) => new Set(s).add(r.partKey));
                          }}
                        />
                      ))}
                    </div>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function ReferencesEditor({ prices, labor }: { prices: PriceRefRow[]; labor: LaborRefRow[] }) {
  return (
    <Tabs defaultValue="prices">
      <TabsList className="w-auto">
        <TabsTrigger value="prices">Parts prices</TabsTrigger>
        <TabsTrigger value="labor">Labor times</TabsTrigger>
      </TabsList>
      <TabsContent value="prices">
        <PricesTab rows={prices} />
      </TabsContent>
      <TabsContent value="labor">
        <LaborTab rows={labor} />
      </TabsContent>
    </Tabs>
  );
}
