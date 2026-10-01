"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

/** Compact manual-entry form for a vehicle when the listing can't be fetched. */
export function ManualFields({ value, onChange }: { value: ManualListing; onChange: (v: ManualListing) => void }) {
  const set = (patch: Partial<ManualListing>) => onChange({ ...value, ...patch });
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="col-span-2 space-y-1.5">
        <Label htmlFor="m-vin">VIN</Label>
        <Input
          id="m-vin"
          value={value.vin ?? ""}
          onChange={(e) => set({ vin: e.target.value.toUpperCase() || null })}
          placeholder="17 characters"
          maxLength={17}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="m-year">Year</Label>
        <Input id="m-year" inputMode="numeric" value={value.year ?? ""} onChange={(e) => set({ year: num(e.target.value) })} placeholder="2019" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="m-odo">Odometer (mi)</Label>
        <Input id="m-odo" inputMode="numeric" value={value.odometer ?? ""} onChange={(e) => set({ odometer: num(e.target.value) })} placeholder="61200" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="m-make">Make</Label>
        <Input id="m-make" value={value.make ?? ""} onChange={(e) => set({ make: e.target.value || null })} placeholder="Audi" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="m-model">Model</Label>
        <Input id="m-model" value={value.model ?? ""} onChange={(e) => set({ model: e.target.value || null })} placeholder="A3" />
      </div>
      <div className="col-span-2 space-y-1.5">
        <Label>Primary damage</Label>
        <Select value={value.primaryDamage ?? ""} onValueChange={(v) => set({ primaryDamage: v })}>
          <SelectTrigger>
            <SelectValue placeholder="Choose…" />
          </SelectTrigger>
          <SelectContent>
            {DAMAGE_OPTIONS.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-2 space-y-1.5">
        <Label htmlFor="m-title">Title</Label>
        <Input id="m-title" value={value.titleRaw ?? ""} onChange={(e) => set({ titleRaw: e.target.value || null })} placeholder="SALVAGE CERTIFICATE (TX)" />
      </div>
      <div className="space-y-1.5">
        <Label>Runs?</Label>
        <Select value={value.runCondition ?? ""} onValueChange={(v) => set({ runCondition: v })}>
          <SelectTrigger>
            <SelectValue placeholder="Unknown" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Run and Drive">Runs & drives</SelectItem>
            <SelectItem value="Engine Starts">Starts</SelectItem>
            <SelectItem value="Won't start">Won&apos;t start</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Keys</Label>
        <Select value={value.hasKeys === true ? "yes" : value.hasKeys === false ? "no" : ""} onValueChange={(v) => set({ hasKeys: v === "yes" })}>
          <SelectTrigger>
            <SelectValue placeholder="Unknown" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="yes">Yes</SelectItem>
            <SelectItem value="no">No</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="m-bid">Current bid ($)</Label>
        <Input id="m-bid" inputMode="numeric" value={value.currentBid ?? ""} onChange={(e) => set({ currentBid: num(e.target.value) })} placeholder="2100" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="m-zip">Yard ZIP</Label>
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
