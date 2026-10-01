"use client";

import { PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { ExportProfileData } from "@/lib/calc/build";

type Draft = Omit<ExportProfileData, "id"> & { id?: string };

const NUMERIC: { key: keyof Draft; label: string; kind: "money" | "bps" | "cents" }[] = [
  { key: "inlandToPortCentsPerMile", label: "Inland to port ($/mi)", kind: "cents" },
  { key: "portAndLoading", label: "Port & loading ($)", kind: "money" },
  { key: "oceanFreight", label: "Ocean freight ($)", kind: "money" },
  { key: "marineInsuranceBps", label: "Marine insurance (%)", kind: "bps" },
  { key: "destinationPortFees", label: "Destination port fees ($)", kind: "money" },
  { key: "customsBrokerFee", label: "Customs broker ($)", kind: "money" },
  { key: "dutyBps", label: "Customs duty (% of CIF)", kind: "bps" },
  { key: "vatBps", label: "VAT (%)", kind: "bps" },
  { key: "registrationTax", label: "Registration / excise ($)", kind: "money" },
  { key: "complianceConversion", label: "Compliance conversion ($)", kind: "money" },
  { key: "deliveryFromPort", label: "Delivery from port ($)", kind: "money" },
];

const NEW: Draft = {
  name: "New profile",
  countryCode: "PL",
  currency: "EUR",
  departurePortZip: "07114",
  inlandToPortCentsPerMile: 100,
  portAndLoading: 350,
  oceanFreight: 1400,
  marineInsuranceBps: 150,
  destinationPortFees: 450,
  customsBrokerFee: 250,
  dutyBps: 1000,
  vatBps: 2300,
  vatRecoverableDefault: false,
  registrationTax: 300,
  complianceConversion: 450,
  deliveryFromPort: 150,
  isPlaceholder: true,
};

function ProfileCard({ initial }: { initial: Draft }) {
  const router = useRouter();
  const [p, setP] = useState<Draft>(initial);
  const shown = (k: keyof Draft, kind: string) => {
    const v = p[k] as number;
    return kind === "bps" || kind === "cents" ? v / 100 : v;
  };
  async function save() {
    const res = await fetch("/api/admin/export-profiles", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(p) });
    if (res.ok) {
      toast.success("Profile saved");
      router.refresh();
    } else toast.error(((await res.json()) as { error?: string }).error ?? "Save failed");
  }
  async function remove() {
    if (!p.id) return;
    await fetch(`/api/admin/export-profiles?id=${p.id}`, { method: "DELETE" });
    router.refresh();
  }
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">{p.name}</CardTitle>
        {p.isPlaceholder && <Badge variant="caution">Placeholder values</Badge>}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Name</Label>
            <Input value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Country</Label>
            <Input maxLength={2} value={p.countryCode} onChange={(e) => setP({ ...p, countryCode: e.target.value.toUpperCase() })} />
          </div>
          <div className="space-y-1.5">
            <Label>Currency</Label>
            <Input maxLength={3} value={p.currency} onChange={(e) => setP({ ...p, currency: e.target.value.toUpperCase() })} />
          </div>
          <div className="space-y-1.5">
            <Label>US departure port ZIP</Label>
            <Input maxLength={5} value={p.departurePortZip} onChange={(e) => setP({ ...p, departurePortZip: e.target.value.replace(/\D/g, "") })} />
          </div>
          {NUMERIC.map((n) => (
            <div key={n.key} className="space-y-1.5">
              <Label className="text-xs">{n.label}</Label>
              <Input
                inputMode="decimal"
                value={shown(n.key, n.kind)}
                onChange={(e) => {
                  const v = Number(e.target.value) || 0;
                  setP({ ...p, [n.key]: n.kind === "money" ? Math.round(v) : Math.round(v * 100) });
                }}
              />
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={p.vatRecoverableDefault} onCheckedChange={(v) => setP({ ...p, vatRecoverableDefault: v })} /> VAT recoverable by default
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={p.isPlaceholder} onCheckedChange={(v) => setP({ ...p, isPlaceholder: v })} /> Placeholder
          </label>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => void save()}>Save</Button>
          {p.id && (
            <Button variant="ghost" onClick={() => void remove()}>
              Delete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function ExportProfilesEditor({ profiles }: { profiles: ExportProfileData[] }) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="space-y-4">
      {profiles.map((p) => (
        <ProfileCard key={p.id} initial={p} />
      ))}
      {adding ? (
        <ProfileCard initial={NEW} />
      ) : (
        <Button variant="outline" onClick={() => setAdding(true)}>
          <PlusIcon /> Add export profile
        </Button>
      )}
    </div>
  );
}
