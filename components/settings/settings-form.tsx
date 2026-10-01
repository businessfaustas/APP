"use client";

import { CheckCircle2Icon, CopyIcon, KeyRoundIcon, Loader2Icon, XCircleIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SegmentedControl } from "@/components/ui/misc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export interface SettingsValues {
  homeZip: string;
  currency: string;
  buyerType: "LICENSED_DEALER" | "PUBLIC_VIA_BROKER";
  laborRate: number;
  paintMaterialsPerHour: number;
  partsSourcePreference: "OEM_NEW" | "AFTERMARKET" | "USED";
  partsDiscountBps: number;
  rebuiltFactorBps: number;
  listToSaleBps: number;
  targetProfitBps: number;
  targetProfitMin: number;
  transportCentsPerMile: number;
  transportMin: number;
  titleRegInspection: number;
  storageDays: number;
  storagePerDay: number;
  holdingCostPerDay: number;
  holdingDaysExpected: number;
  sellingCostBps: number;
  sellingCostFixed: number;
  salesTaxBps: number;
  brokerFee: number;
  contingencyOverrideBps: number | null;
  exitStrategy: "RETAIL_REBUILT" | "EXPORT";
  exportProfileId: string | null;
  vatRecoverable: boolean;
}

type NumKey = { [K in keyof SettingsValues]: SettingsValues[K] extends number ? K : never }[keyof SettingsValues];

function NumField({
  label,
  hint,
  value,
  onChange,
  kind = "money",
  id,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (v: number) => void;
  kind?: "money" | "bps" | "cents" | "int";
  id: string;
}) {
  const display = kind === "bps" ? String(value / 100) : kind === "cents" ? (value / 100).toFixed(2) : String(value);
  const [text, setText] = useState<string | null>(null);
  const suffix = kind === "bps" ? "%" : kind === "int" ? "" : "$";
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        {suffix === "$" && <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">$</span>}
        <Input
          id={id}
          inputMode="decimal"
          className={suffix === "$" ? "pl-6" : suffix === "%" ? "pr-7" : ""}
          value={text ?? display}
          onFocus={() => setText(display)}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            const n = Number((text ?? "").replace(/[^\d.]/g, ""));
            if (text !== null && Number.isFinite(n)) onChange(kind === "bps" || kind === "cents" ? Math.round(n * 100) : Math.round(n));
            setText(null);
          }}
        />
        {suffix === "%" && <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">%</span>}
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function SettingsForm({
  initial,
  exportProfiles,
  integrations,
  hasToken,
}: {
  initial: SettingsValues;
  exportProfiles: { id: string; name: string; isPlaceholder: boolean }[];
  integrations: { key: string; label: string; enabled: boolean; note: string }[];
  hasToken: boolean;
}) {
  const router = useRouter();
  const [v, setV] = useState<SettingsValues>(initial);
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [tokenExists, setTokenExists] = useState(hasToken);
  const set = <K extends keyof SettingsValues>(k: K, val: SettingsValues[K]) => setV((x) => ({ ...x, [k]: val }));
  const num = (k: NumKey) => (val: number) => set(k, val);

  async function save() {
    setBusy(true);
    const res = await fetch("/api/settings", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(v) });
    setBusy(false);
    if (res.ok) {
      toast.success("Settings saved — new reports will use them");
      router.refresh();
    } else toast.error(((await res.json()) as { error?: string }).error ?? "Couldn't save");
  }

  async function createToken() {
    const res = await fetch("/api/settings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "create-token" }) });
    const body = (await res.json()) as { token?: string };
    if (body.token) {
      setToken(body.token);
      setTokenExists(true);
    }
  }
  async function revokeToken() {
    await fetch("/api/settings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "revoke-token" }) });
    setToken(null);
    setTokenExists(false);
    toast.success("Token revoked");
  }
  async function deleteAccount() {
    if (!confirm("Delete your account and all reports permanently? This can't be undone.")) return;
    const res = await fetch("/api/account", { method: "DELETE" });
    if (res.ok) window.location.href = "/";
    else toast.error("Couldn't delete the account");
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Business profile</CardTitle>
          <CardDescription>Where cars are delivered and how you buy.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="s-zip">Your ZIP code</Label>
            <Input id="s-zip" inputMode="numeric" maxLength={5} value={v.homeZip} onChange={(e) => set("homeZip", e.target.value.replace(/\D/g, ""))} />
            <p className="text-xs text-muted-foreground">Used for transport distance and local comps.</p>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Buyer type</Label>
            <SegmentedControl
              ariaLabel="Buyer type"
              value={v.buyerType}
              onValueChange={(x) => set("buyerType", x)}
              options={[
                { value: "LICENSED_DEALER", label: "Licensed dealer" },
                { value: "PUBLIC_VIA_BROKER", label: "Public buyer (via broker)" },
              ]}
            />
            <p className="text-xs text-muted-foreground">Public buyers usually pay a broker fee and sales tax — set them below.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Repair costs</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <NumField id="s-labor" label="Labor rate (per hour)" value={v.laborRate} onChange={num("laborRate")} />
          <NumField id="s-paint" label="Paint materials (per paint hour)" value={v.paintMaterialsPerHour} onChange={num("paintMaterialsPerHour")} />
          <NumField id="s-disc" label="Parts discount" kind="bps" value={v.partsDiscountBps} onChange={num("partsDiscountBps")} />
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Preferred parts source</Label>
            <SegmentedControl
              ariaLabel="Preferred parts source"
              value={v.partsSourcePreference}
              onValueChange={(x) => set("partsSourcePreference", x)}
              options={[
                { value: "OEM_NEW", label: "OEM" },
                { value: "AFTERMARKET", label: "Aftermarket" },
                { value: "USED", label: "Used" },
              ]}
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="s-cont">Fixed contingency</Label>
              <Switch id="s-cont" checked={v.contingencyOverrideBps !== null} onCheckedChange={(on) => set("contingencyOverrideBps", on ? 1500 : null)} />
            </div>
            {v.contingencyOverrideBps !== null ? (
              <NumField id="s-cont-v" label="Contingency" kind="bps" value={v.contingencyOverrideBps} onChange={(x) => set("contingencyOverrideBps", x)} />
            ) : (
              <p className="text-xs text-muted-foreground">Off: 10–35% by damage severity.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profit & resale</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-4">
          <NumField id="s-tp" label="Target profit" kind="bps" hint="% of resale" value={v.targetProfitBps} onChange={num("targetProfitBps")} />
          <NumField id="s-tpm" label="Minimum profit" value={v.targetProfitMin} onChange={num("targetProfitMin")} />
          <NumField id="s-rb" label="Rebuilt-title value" kind="bps" hint="% of clean value" value={v.rebuiltFactorBps} onChange={num("rebuiltFactorBps")} />
          <NumField id="s-lts" label="List-to-sale ratio" kind="bps" hint="sale price ÷ asking" value={v.listToSaleBps} onChange={num("listToSaleBps")} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Other costs</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-4">
          <NumField id="s-tr" label="Transport per mile" kind="cents" value={v.transportCentsPerMile} onChange={num("transportCentsPerMile")} />
          <NumField id="s-trm" label="Transport minimum" value={v.transportMin} onChange={num("transportMin")} />
          <NumField id="s-title" label="Title / inspection / registration" value={v.titleRegInspection} onChange={num("titleRegInspection")} />
          <NumField id="s-broker" label="Broker fee" value={v.brokerFee} onChange={num("brokerFee")} />
          <NumField id="s-hcd" label="Holding cost per day" value={v.holdingCostPerDay} onChange={num("holdingCostPerDay")} />
          <NumField id="s-hd" label="Days to sell (expected)" kind="int" value={v.holdingDaysExpected} onChange={num("holdingDaysExpected")} />
          <NumField id="s-sd" label="Storage days" kind="int" value={v.storageDays} onChange={num("storageDays")} />
          <NumField id="s-spd" label="Storage per day" value={v.storagePerDay} onChange={num("storagePerDay")} />
          <NumField id="s-sell" label="Selling cost" kind="bps" hint="% of resale" value={v.sellingCostBps} onChange={num("sellingCostBps")} />
          <NumField id="s-sellf" label="Selling cost (fixed)" value={v.sellingCostFixed} onChange={num("sellingCostFixed")} />
          <NumField id="s-tax" label="Sales tax on purchase" kind="bps" value={v.salesTaxBps} onChange={num("salesTaxBps")} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Export mode</CardTitle>
          <CardDescription>For buyers shipping cars abroad (e.g. US → EU): freight, customs duty, VAT and conversion.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Default exit</Label>
            <SegmentedControl
              ariaLabel="Default exit strategy"
              value={v.exitStrategy}
              onValueChange={(x) => set("exitStrategy", x)}
              options={[
                { value: "RETAIL_REBUILT", label: "Retail" },
                { value: "EXPORT", label: "Export" },
              ]}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Export profile</Label>
            <Select value={v.exportProfileId ?? "none"} onValueChange={(x) => set("exportProfileId", x === "none" ? null : x)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {exportProfiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                    {p.isPlaceholder ? " (placeholder)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between gap-2 pt-6">
            <Label htmlFor="s-vat">VAT recoverable (VAT-registered business)</Label>
            <Switch id="s-vat" checked={v.vatRecoverable} onCheckedChange={(x) => set("vatRecoverable", x)} />
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-20 z-10 flex justify-end md:bottom-4">
        <Button size="lg" onClick={() => void save()} disabled={busy} className="shadow-lg">
          {busy && <Loader2Icon className="animate-spin" />} Save settings
        </Button>
      </div>

      <Card id="extension">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRoundIcon className="size-4" /> Browser extension
          </CardTitle>
          <CardDescription>
            The Chrome extension adds an &ldquo;Analyze with AuctionPulse&rdquo; button to Copart, IAAI and Bid.cars lot pages. Create a token and paste it into the
            extension&apos;s settings. See <code>extension/README.md</code> to install it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {token && (
            <div className="space-y-2 rounded-md bg-muted p-3">
              <p className="text-xs">Copy this token now — it won&apos;t be shown again.</p>
              <div className="flex gap-2">
                <Input readOnly value={token} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
                <Button size="icon" variant="outline" aria-label="Copy token" onClick={() => void navigator.clipboard.writeText(token).then(() => toast.success("Copied"))}>
                  <CopyIcon />
                </Button>
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void createToken()}>
              {tokenExists ? "Rotate token" : "Create token"}
            </Button>
            {tokenExists && (
              <Button variant="ghost" onClick={() => void revokeToken()}>
                Revoke
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Integrations</CardTitle>
          <CardDescription>Configured by the server administrator in the environment variables.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 sm:grid-cols-2">
            {integrations.map((i) => (
              <li key={i.key} className="flex items-start gap-2 text-sm">
                {i.enabled ? <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-go" /> : <XCircleIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
                <div>
                  <div className="font-medium">
                    {i.label} {i.key === "demo" && i.enabled && <Badge variant="info">on</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">{i.note}</div>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your data</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <a href="/api/account">Export my data (JSON)</a>
          </Button>
          <Button variant="destructive" onClick={() => void deleteAccount()}>
            Delete my account
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
