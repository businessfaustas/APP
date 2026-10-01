"use client";

import { ExternalLinkIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RUN_LABELS, TITLE_LABELS } from "@/lib/domain/titles";
import { VEHICLE_CLASS_LABELS } from "@/lib/domain/vehicleClass";
import { exportCostsFrom } from "@/lib/calc/build";
import { formatDate, formatDateTime, formatNumber, formatUsd } from "@/lib/utils";

import { useReport } from "./report-context";

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-right">{v ?? "—"}</dd>
    </div>
  );
}

export function VehicleTab() {
  const { view } = useReport();
  const v = view.vehicle;
  const l = view.listing;
  const h = view.history;
  if (!l) return null;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vehicle</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="divide-y">
            <Row k="VIN" v={<span className="font-mono text-xs">{l.vin ?? "—"}</span>} />
            <Row k="Year / make / model" v={[v?.year ?? l.year, v?.make ?? l.make, v?.model ?? l.model].filter(Boolean).join(" ")} />
            <Row k="Trim" v={v?.trim ?? l.trim} />
            <Row k="Body" v={v?.bodyClass} />
            <Row k="Engine" v={v?.engine ?? l.engine} />
            <Row k="Transmission" v={v?.transmission ?? l.transmission} />
            <Row k="Drive" v={v?.driveType ?? l.drive} />
            <Row k="Fuel" v={v?.fuelType ?? l.fuel} />
            <Row k="Class" v={v ? VEHICLE_CLASS_LABELS[v.vehicleClass] : "—"} />
            <Row k="Decoded by" v={v?.decodeSource} />
          </dl>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Listing</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="divide-y">
            <Row k="Odometer" v={l.odometer !== null ? `${formatNumber(l.odometer)} ${l.odometerUnit} (${l.odometerBrand.toLowerCase().replace(/_/g, " ")})` : "—"} />
            <Row k="Title" v={`${TITLE_LABELS[l.titleCategory]}${l.titleRaw ? ` — ${l.titleRaw}` : ""}`} />
            <Row k="Primary damage" v={l.primaryDamage} />
            <Row k="Secondary damage" v={l.secondaryDamage} />
            <Row k="Condition" v={RUN_LABELS[l.runCondition]} />
            <Row k="Keys" v={l.hasKeys === null ? "Unknown" : l.hasKeys ? "Yes" : "No"} />
            <Row k="Sale date" v={formatDateTime(l.saleDate)} />
            <Row k="Sale status" v={l.saleStatus.toLowerCase().replace(/_/g, " ")} />
            <Row k="Auction's retail value" v={l.listedRetailValue ? `${formatUsd(l.listedRetailValue)} (low trust)` : "—"} />
            <Row k="Seller" v={l.sellerType} />
          </dl>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recalls & common problems</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {v && v.recalls.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {v.recalls.map((r) => (
                <li key={r.campaign}>
                  <div className="font-medium">
                    {r.component} <span className="text-xs font-normal text-muted-foreground">#{r.campaign}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{r.summary}</div>
                </li>
              ))}
              <li className="text-xs text-muted-foreground">Recalls listed for this model year — dealers repair open recalls free. Check the VIN-specific status.</li>
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No recalls found for this model year.</p>
          )}
          {v && v.complaints.length > 0 && (
            <div>
              <div className="mb-1.5 text-xs font-medium text-muted-foreground">Most-reported problems (NHTSA complaints)</div>
              <div className="flex flex-wrap gap-1.5">
                {v.complaints.map((c) => (
                  <Badge key={c.component} variant="outline">
                    {c.component.toLowerCase()} · {c.count}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {l.vin && (
            <a href="https://www.nicb.org/vincheck" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline">
              Free theft / total-loss check (NICB VINCheck) <ExternalLinkIcon className="size-3.5" />
            </a>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Title & odometer history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {h ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Event</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {h.titleRecords.map((t, i) => (
                    <TableRow key={`t${i}`}>
                      <TableCell>{formatDate(t.date)}</TableCell>
                      <TableCell>{t.state ?? "—"}</TableCell>
                      <TableCell>Title: {t.brand}</TableCell>
                    </TableRow>
                  ))}
                  {h.junkSalvageRecords.map((j, i) => (
                    <TableRow key={`j${i}`}>
                      <TableCell>{formatDate(j.date)}</TableCell>
                      <TableCell>—</TableCell>
                      <TableCell>
                        {j.reportingEntity}
                        {j.disposition ? ` — ${j.disposition}` : ""}
                      </TableCell>
                    </TableRow>
                  ))}
                  {h.odometerRecords.map((o, i) => (
                    <TableRow key={`o${i}`}>
                      <TableCell>{formatDate(o.date)}</TableCell>
                      <TableCell>—</TableCell>
                      <TableCell className="num">Odometer {formatNumber(o.reading)} mi</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="text-xs text-muted-foreground">
                Source: {h.provider}.{" "}
                {!h.isDemo &&
                  "NMVTIS data comes from state titling agencies, insurers and salvage/junk yards. It may not include every event, and it isn't a substitute for an inspection."}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No history provider is configured. Add a VinAudit key for NMVTIS title and odometer history.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function LogisticsTab() {
  const { view, calc, assumptions } = useReport();
  const l = view.listing;
  const lg = view.logistics;
  const base = view.base;
  if (!l || !lg || !calc || !base) return null;
  const exportMode = assumptions.exitStrategy === "EXPORT" && base.exportProfile;
  const ec = exportMode && base.exportProfile ? exportCostsFrom(base.exportProfile, base.milesToPort ?? base.distanceMiles, assumptions) : null;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transport</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="divide-y">
            <Row k="Yard" v={[l.location.yardName, l.location.city, l.location.state, l.location.zip].filter(Boolean).join(", ")} />
            <Row k="Delivered to" v={lg.userZip ? `ZIP ${lg.userZip}` : "—"} />
            <Row k="Distance" v={`${formatNumber(assumptions.distanceOverride ?? lg.distanceMiles)} mi${lg.method === "DEFAULT" ? " (estimated)" : ""}`} />
            <Row k="Rate" v={`$${(assumptions.transportCentsPerMile / 100).toFixed(2)}/mi, min ${formatUsd(assumptions.transportMin)}`} />
            <Row k="Transport cost" v={formatUsd(calc.scenarios.expected.logistics)} />
            <Row k="Title / inspection / storage" v={formatUsd(calc.scenarios.expected.admin)} />
          </dl>
        </CardContent>
      </Card>
      {ec && base.exportProfile && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Export — {base.exportProfile.name}</CardTitle>
            {base.exportProfile.isPlaceholder && <p className="text-xs text-caution">Placeholder profile — edit the real costs in Admin → Export profiles.</p>}
          </CardHeader>
          <CardContent>
            <dl className="divide-y">
              <Row k="Inland to port" v={formatUsd(ec.inlandToPort)} />
              <Row k="Port & loading" v={formatUsd(ec.portAndLoading)} />
              <Row k="Ocean freight" v={formatUsd(ec.oceanFreight)} />
              <Row k="Destination port + customs broker" v={formatUsd(ec.destinationPortFees + ec.customsBrokerFee)} />
              <Row k="Customs duty" v={`${ec.dutyBps / 100}% of CIF`} />
              <Row k="VAT" v={ec.vatRecoverable ? "Recoverable" : `${ec.vatBps / 100}% of CIF + duty`} />
              <Row k="Registration / excise" v={formatUsd(ec.registrationTax)} />
              <Row k="Compliance conversion" v={formatUsd(ec.complianceConversion)} />
              <Row k="Delivery from port" v={formatUsd(ec.deliveryFromPort)} />
              <Row k="Duty + VAT at max bid" v={formatUsd((calc.acquisitionAtMaxBid?.duty ?? 0) + (calc.acquisitionAtMaxBid?.vat ?? 0))} />
            </dl>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
