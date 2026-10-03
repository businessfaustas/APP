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
import { useT } from "@/lib/i18n/client";
import { rich } from "@/lib/i18n/rich";

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
        {suffix === "$" && <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">$</span>}
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
        {suffix === "%" && <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">%</span>}
      </div>
      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
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
  const t = useT();
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
      toast.success(t("settings.saved"));
      router.refresh();
    } else toast.error(((await res.json()) as { error?: string }).error ?? t("settings.couldNotSave"));
  }

  async function createToken() {
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "create-token" }),
    });
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
    toast.success(t("settings.tokenRevoked"));
  }
  async function deleteAccount() {
    if (!confirm(t("settings.confirmDelete"))) return;
    const res = await fetch("/api/account", { method: "DELETE" });
    // Full reload on purpose: drops every client-side cache of the deleted account.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    if (res.ok) window.location.href = "/";
    else toast.error(t("settings.couldNotDelete"));
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("settings.business")}</CardTitle>
          <CardDescription>{t("settings.businessBody")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="s-zip">{t("settings.zip")}</Label>
            <Input id="s-zip" inputMode="numeric" maxLength={5} value={v.homeZip} onChange={(e) => set("homeZip", e.target.value.replace(/\D/g, ""))} />
            <p className="text-muted-foreground text-xs">{t("settings.zipHint")}</p>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>{t("settings.buyerType")}</Label>
            <SegmentedControl
              ariaLabel={t("settings.buyerType")}
              value={v.buyerType}
              onValueChange={(x) => set("buyerType", x)}
              options={[
                { value: "LICENSED_DEALER", label: t("domain.buyerType.LICENSED_DEALER") },
                { value: "PUBLIC_VIA_BROKER", label: t("settings.publicBroker") },
              ]}
            />
            <p className="text-muted-foreground text-xs">{t("settings.buyerHint")}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("settings.repairCosts")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <NumField id="s-labor" label={t("settings.laborRate")} value={v.laborRate} onChange={num("laborRate")} />
          <NumField id="s-paint" label={t("settings.paint")} value={v.paintMaterialsPerHour} onChange={num("paintMaterialsPerHour")} />
          <NumField id="s-disc" label={t("settings.partsDiscount")} kind="bps" value={v.partsDiscountBps} onChange={num("partsDiscountBps")} />
          <div className="space-y-1.5 sm:col-span-2">
            <Label>{t("settings.partsSource")}</Label>
            <SegmentedControl
              ariaLabel={t("settings.partsSource")}
              value={v.partsSourcePreference}
              onValueChange={(x) => set("partsSourcePreference", x)}
              options={[
                { value: "OEM_NEW", label: t("domain.partSource.OEM_NEW") },
                { value: "AFTERMARKET", label: t("domain.partSource.AFTERMARKET") },
                { value: "USED", label: t("domain.partSource.USED") },
              ]}
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="s-cont">{t("settings.fixedContingency")}</Label>
              <Switch id="s-cont" checked={v.contingencyOverrideBps !== null} onCheckedChange={(on) => set("contingencyOverrideBps", on ? 1500 : null)} />
            </div>
            {v.contingencyOverrideBps !== null ? (
              <NumField
                id="s-cont-v"
                label={t("settings.contingency")}
                kind="bps"
                value={v.contingencyOverrideBps}
                onChange={(x) => set("contingencyOverrideBps", x)}
              />
            ) : (
              <p className="text-muted-foreground text-xs">{t("settings.contingencyOff")}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("settings.profitResale")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-4">
          <NumField
            id="s-tp"
            label={t("settings.targetProfit")}
            kind="bps"
            hint={t("settings.ofResale")}
            value={v.targetProfitBps}
            onChange={num("targetProfitBps")}
          />
          <NumField id="s-tpm" label={t("settings.minProfit")} value={v.targetProfitMin} onChange={num("targetProfitMin")} />
          <NumField
            id="s-rb"
            label={t("settings.rebuilt")}
            kind="bps"
            hint={t("settings.ofClean")}
            value={v.rebuiltFactorBps}
            onChange={num("rebuiltFactorBps")}
          />
          <NumField
            id="s-lts"
            label={t("settings.listToSale")}
            kind="bps"
            hint={t("settings.listToSaleHint")}
            value={v.listToSaleBps}
            onChange={num("listToSaleBps")}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("settings.otherCosts")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-4">
          <NumField id="s-tr" label={t("settings.transportMile")} kind="cents" value={v.transportCentsPerMile} onChange={num("transportCentsPerMile")} />
          <NumField id="s-trm" label={t("settings.transportMin")} value={v.transportMin} onChange={num("transportMin")} />
          <NumField id="s-title" label={t("settings.titleFees")} value={v.titleRegInspection} onChange={num("titleRegInspection")} />
          <NumField id="s-broker" label={t("settings.brokerFee")} value={v.brokerFee} onChange={num("brokerFee")} />
          <NumField id="s-hcd" label={t("settings.holdingDay")} value={v.holdingCostPerDay} onChange={num("holdingCostPerDay")} />
          <NumField id="s-hd" label={t("settings.daysToSell")} kind="int" value={v.holdingDaysExpected} onChange={num("holdingDaysExpected")} />
          <NumField id="s-sd" label={t("settings.storageDays")} kind="int" value={v.storageDays} onChange={num("storageDays")} />
          <NumField id="s-spd" label={t("settings.storageDay")} value={v.storagePerDay} onChange={num("storagePerDay")} />
          <NumField
            id="s-sell"
            label={t("settings.sellingCost")}
            kind="bps"
            hint={t("settings.ofResale")}
            value={v.sellingCostBps}
            onChange={num("sellingCostBps")}
          />
          <NumField id="s-sellf" label={t("settings.sellingFixed")} value={v.sellingCostFixed} onChange={num("sellingCostFixed")} />
          <NumField id="s-tax" label={t("settings.salesTax")} kind="bps" value={v.salesTaxBps} onChange={num("salesTaxBps")} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("settings.exportMode")}</CardTitle>
          <CardDescription>{t("settings.exportBody")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>{t("settings.defaultExit")}</Label>
            <SegmentedControl
              ariaLabel={t("settings.defaultExitAria")}
              value={v.exitStrategy}
              onValueChange={(x) => set("exitStrategy", x)}
              options={[
                { value: "RETAIL_REBUILT", label: t("settings.retail") },
                { value: "EXPORT", label: t("settings.export") },
              ]}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("settings.exportProfile")}</Label>
            <Select value={v.exportProfileId ?? "none"} onValueChange={(x) => set("exportProfileId", x === "none" ? null : x)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("settings.none")}</SelectItem>
                {exportProfiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                    {p.isPlaceholder ? t("settings.placeholder") : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between gap-2 pt-6">
            <Label htmlFor="s-vat">{t("settings.vat")}</Label>
            <Switch id="s-vat" checked={v.vatRecoverable} onCheckedChange={(x) => set("vatRecoverable", x)} />
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-20 z-10 flex justify-end md:bottom-4">
        <Button size="lg" onClick={() => void save()} disabled={busy} className="shadow-lg">
          {busy && <Loader2Icon className="animate-spin" />} {t("settings.save")}
        </Button>
      </div>

      <Card id="extension">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRoundIcon className="size-4" /> {t("settings.extension")}
          </CardTitle>
          <CardDescription>{rich(t("settings.extensionBody"), { readme: <code>extension/README.md</code> })}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {token && (
            <div className="bg-muted space-y-2 rounded-md p-3">
              <p className="text-xs">{t("settings.copyNow")}</p>
              <div className="flex gap-2">
                <Input readOnly value={token} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
                <Button
                  size="icon"
                  variant="outline"
                  aria-label={t("settings.copyToken")}
                  onClick={() => void navigator.clipboard.writeText(token).then(() => toast.success(t("settings.copied")))}
                >
                  <CopyIcon />
                </Button>
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void createToken()}>
              {tokenExists ? t("settings.rotate") : t("settings.create")}
            </Button>
            {tokenExists && (
              <Button variant="ghost" onClick={() => void revokeToken()}>
                {t("settings.revoke")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("settings.integrations")}</CardTitle>
          <CardDescription>{t("settings.integrationsBody")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 sm:grid-cols-2">
            {integrations.map((i) => (
              <li key={i.key} className="flex items-start gap-2 text-sm">
                {i.enabled ? (
                  <CheckCircle2Icon className="text-go mt-0.5 size-4 shrink-0" />
                ) : (
                  <XCircleIcon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                )}
                <div>
                  <div className="font-medium">
                    {i.key === "ai" ? i.label : t.dyn(`settings.int.${i.key}.label`, undefined, i.label)}{" "}
                    {i.key === "demo" && i.enabled && <Badge variant="info">{t("settings.on")}</Badge>}
                  </div>
                  <div className="text-muted-foreground text-xs">{t.dyn(`settings.int.${i.key}.note`, undefined, i.note)}</div>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("settings.yourData")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <a href="/api/account">{t("settings.exportData")}</a>
          </Button>
          <Button variant="destructive" onClick={() => void deleteAccount()}>
            {t("settings.deleteAccount")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
