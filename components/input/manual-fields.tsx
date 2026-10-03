"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useT } from "@/lib/i18n/client";
import { damageLabel } from "@/lib/i18n/labels";
import type { ManualListing } from "@/lib/pipeline/types";

export const DAMAGE_OPTIONS = [
  "FRONT END",
  "REAR END",
  "LEFT SIDE",
  "RIGHT SIDE",
  "SIDE",
  "TOP/ROOF",
  "ROLLOVER",
  "UNDERCARRIAGE",
  "WATER/FLOOD",
  "HAIL",
  "MINOR DENT/SCRATCHES",
  "MECHANICAL",
  "BURN",
  "VANDALISM",
  "ALL OVER",
];

function num(v: string): number | null {
  const n = Number(v.replace(/[^\d]/g, ""));
  return v.trim() === "" || Number.isNaN(n) ? null : n;
}

/** The few details that decide the numbers, for when the link already identified the car. */
export function QuickFields({ value, onChange }: { value: ManualListing; onChange: (v: ManualListing) => void }) {
  const t = useT();
  const set = (patch: Partial<ManualListing>) => onChange({ ...value, ...patch });
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2 space-y-1.5">
        <Label htmlFor="q-damage">{t("fields.primaryDamage")}</Label>
        <Select value={value.primaryDamage ?? ""} onValueChange={(v) => set({ primaryDamage: v })}>
          <SelectTrigger id="q-damage" data-testid="quick-damage">
            <SelectValue placeholder={t("fields.chooseDamage")} />
          </SelectTrigger>
          <SelectContent>
            {DAMAGE_OPTIONS.map((d) => (
              <SelectItem key={d} value={d}>
                {damageLabel(t, d)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="q-odo">{t("fields.odometer")}</Label>
        <Input
          id="q-odo"
          inputMode="numeric"
          value={value.odometer ?? ""}
          onChange={(e) => set({ odometer: num(e.target.value) })}
          placeholder={t("fields.fromLotPage")}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="q-bid">{t("fields.currentBid")}</Label>
        <Input
          id="q-bid"
          inputMode="numeric"
          value={value.currentBid ?? ""}
          onChange={(e) => set({ currentBid: num(e.target.value) })}
          placeholder={t("fields.fromLotPage")}
        />
      </div>
      <div className="col-span-2 space-y-1.5">
        <Label htmlFor="q-acv">{t("fields.retailValue")}</Label>
        <Input
          id="q-acv"
          inputMode="numeric"
          value={value.listedRetailValue ?? ""}
          onChange={(e) => set({ listedRetailValue: num(e.target.value) })}
          placeholder={t("fields.fromLotPage")}
        />
        <p className="text-muted-foreground text-xs">{t("fields.retailHelp")}</p>
      </div>
    </div>
  );
}

/** Compact manual-entry form for a vehicle when the listing can't be fetched. */
export function ManualFields({ value, onChange }: { value: ManualListing; onChange: (v: ManualListing) => void }) {
  const t = useT();
  const set = (patch: Partial<ManualListing>) => onChange({ ...value, ...patch });
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="col-span-2 space-y-1.5">
        <Label htmlFor="m-vin">{t("fields.vin")}</Label>
        <Input
          id="m-vin"
          value={value.vin ?? ""}
          onChange={(e) => set({ vin: e.target.value.toUpperCase() || null })}
          placeholder={t("fields.vinPlaceholder")}
          maxLength={17}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="m-year">{t("fields.year")}</Label>
        <Input id="m-year" inputMode="numeric" value={value.year ?? ""} onChange={(e) => set({ year: num(e.target.value) })} placeholder="2019" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="m-odo">{t("fields.odometer")}</Label>
        <Input id="m-odo" inputMode="numeric" value={value.odometer ?? ""} onChange={(e) => set({ odometer: num(e.target.value) })} placeholder="61200" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="m-make">{t("fields.make")}</Label>
        <Input id="m-make" value={value.make ?? ""} onChange={(e) => set({ make: e.target.value || null })} placeholder="Audi" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="m-model">{t("fields.model")}</Label>
        <Input id="m-model" value={value.model ?? ""} onChange={(e) => set({ model: e.target.value || null })} placeholder="A3" />
      </div>
      <div className="col-span-2 space-y-1.5">
        <Label>{t("fields.primaryDamage")}</Label>
        <Select value={value.primaryDamage ?? ""} onValueChange={(v) => set({ primaryDamage: v })}>
          <SelectTrigger>
            <SelectValue placeholder={t("fields.choose")} />
          </SelectTrigger>
          <SelectContent>
            {DAMAGE_OPTIONS.map((d) => (
              <SelectItem key={d} value={d}>
                {damageLabel(t, d)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-2 space-y-1.5">
        <Label htmlFor="m-title">{t("fields.title")}</Label>
        <Input id="m-title" value={value.titleRaw ?? ""} onChange={(e) => set({ titleRaw: e.target.value || null })} placeholder="SALVAGE CERTIFICATE (TX)" />
      </div>
      <div className="space-y-1.5">
        <Label>{t("fields.runs")}</Label>
        <Select value={value.runCondition ?? ""} onValueChange={(v) => set({ runCondition: v })}>
          <SelectTrigger>
            <SelectValue placeholder={t("fields.unknown")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Run and Drive">{t("domain.run.RUNS_AND_DRIVES")}</SelectItem>
            <SelectItem value="Engine Starts">{t("domain.run.STARTS")}</SelectItem>
            <SelectItem value="Won't start">{t("domain.run.WONT_START")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>{t("fields.keys")}</Label>
        <Select value={value.hasKeys === true ? "yes" : value.hasKeys === false ? "no" : ""} onValueChange={(v) => set({ hasKeys: v === "yes" })}>
          <SelectTrigger>
            <SelectValue placeholder={t("fields.unknown")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="yes">{t("common.yes")}</SelectItem>
            <SelectItem value="no">{t("common.no")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="m-bid">{t("fields.currentBid")}</Label>
        <Input id="m-bid" inputMode="numeric" value={value.currentBid ?? ""} onChange={(e) => set({ currentBid: num(e.target.value) })} placeholder="2100" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="m-acv">{t("fields.retailShort")}</Label>
        <Input
          id="m-acv"
          inputMode="numeric"
          value={value.listedRetailValue ?? ""}
          onChange={(e) => set({ listedRetailValue: num(e.target.value) })}
          placeholder="21450"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="m-zip">{t("fields.yardZip")}</Label>
        <Input
          id="m-zip"
          inputMode="numeric"
          value={value.zip ?? ""}
          onChange={(e) => set({ zip: e.target.value.replace(/\D/g, "").slice(0, 5) || null })}
          placeholder="75236"
        />
      </div>
    </div>
  );
}
