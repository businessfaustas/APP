"use client";

import { ExternalLinkIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { exportCostsFrom } from "@/lib/calc/build";
import { useLocale, useT } from "@/lib/i18n/client";
import { trText } from "@/lib/i18n/generated";
import { damageLabel, keysLabel, runLabel, titleLabel } from "@/lib/i18n/labels";
import { INTL_LOCALE } from "@/lib/i18n/locales";
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
  const t = useT();
  const intl = INTL_LOCALE[useLocale()];
  const v = view.vehicle;
  const l = view.listing;
  const h = view.history;
  if (!l) return null;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("report.vehicle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="divide-y">
            <Row k={t("report.vin")} v={<span className="font-mono text-xs">{l.vin ?? "—"}</span>} />
            <Row k={t("report.ymm")} v={[v?.year ?? l.year, v?.make ?? l.make, v?.model ?? l.model].filter(Boolean).join(" ")} />
            <Row k={t("report.trim")} v={v?.trim ?? l.trim} />
            <Row k={t("report.body")} v={v?.bodyClass} />
            <Row k={t("report.engine")} v={v?.engine ?? l.engine} />
            <Row k={t("report.transmission")} v={v?.transmission ?? l.transmission} />
            <Row k={t("report.drive")} v={v?.driveType ?? l.drive} />
            <Row k={t("report.fuel")} v={v?.fuelType ?? l.fuel} />
            <Row k={t("report.class")} v={v ? t(`report.vehicleClass.${v.vehicleClass}`) : "—"} />
            <Row k={t("report.decodedBy")} v={v?.decodeSource} />
          </dl>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("report.listing")}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="divide-y">
            <Row
              k={t("report.odometer")}
              v={l.odometer !== null ? `${formatNumber(l.odometer)} ${l.odometerUnit} (${t(`report.odoBrand.${l.odometerBrand}`)})` : "—"}
            />
            <Row k={t("report.title")} v={`${titleLabel(t, l.titleCategory)}${l.titleRaw ? ` — ${l.titleRaw}` : ""}`} />
            <Row k={t("report.primaryDamage")} v={l.primaryDamage ? damageLabel(t, l.primaryDamage) : null} />
            <Row k={t("report.secondaryDamage")} v={l.secondaryDamage ? damageLabel(t, l.secondaryDamage) : null} />
            <Row k={t("report.condition")} v={runLabel(t, l.runCondition)} />
            <Row k={t("report.keys")} v={keysLabel(t, l.hasKeys)} />
            <Row k={t("report.saleDate")} v={formatDateTime(l.saleDate, intl)} />
            <Row k={t("report.saleStatus")} v={t(`report.saleStatusValue.${l.saleStatus}`)} />
            <Row k={t("report.auctionRetail")} v={l.listedRetailValue ? t("report.lowTrust", { amount: formatUsd(l.listedRetailValue) }) : "—"} />
            <Row k={t("report.seller")} v={l.sellerType} />
          </dl>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("report.recallsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {v && v.recalls.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {v.recalls.map((r) => (
                <li key={r.campaign}>
                  <div className="font-medium">
                    {r.component} <span className="text-muted-foreground text-xs font-normal">#{r.campaign}</span>
                  </div>
                  <div className="text-muted-foreground text-xs">{r.summary}</div>
                </li>
              ))}
              <li className="text-muted-foreground text-xs">{t("report.recallsNote")}</li>
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">{t("report.noRecalls")}</p>
          )}
          {v && v.complaints.length > 0 && (
            <div>
              <div className="text-muted-foreground mb-1.5 text-xs font-medium">{t("report.complaints")}</div>
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
            <a
              href="https://www.nicb.org/vincheck"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary inline-flex items-center gap-1 text-sm underline-offset-4 hover:underline"
            >
              {t("report.nicb")} <ExternalLinkIcon className="size-3.5" />
            </a>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("report.historyTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {h ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("report.date")}</TableHead>
                    <TableHead>{t("report.state")}</TableHead>
                    <TableHead>{t("report.event")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {h.titleRecords.map((rec, i) => (
                    <TableRow key={`t${i}`}>
                      <TableCell>{formatDate(rec.date, intl)}</TableCell>
                      <TableCell>{rec.state ?? "—"}</TableCell>
                      <TableCell>{t("report.titleEvent", { brand: rec.brand })}</TableCell>
                    </TableRow>
                  ))}
                  {h.junkSalvageRecords.map((j, i) => (
                    <TableRow key={`j${i}`}>
                      <TableCell>{formatDate(j.date, intl)}</TableCell>
                      <TableCell>—</TableCell>
                      <TableCell>
                        {j.reportingEntity}
                        {j.disposition ? ` — ${j.disposition}` : ""}
                      </TableCell>
                    </TableRow>
                  ))}
                  {h.odometerRecords.map((o, i) => (
                    <TableRow key={`o${i}`}>
                      <TableCell>{formatDate(o.date, intl)}</TableCell>
                      <TableCell>—</TableCell>
                      <TableCell className="num">{t("report.odometerEvent", { n: formatNumber(o.reading) })}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="text-muted-foreground text-xs">
                {t("report.historySource", { provider: trText(t, h.provider) })} {!h.isDemo && t("report.nmvtisNote")}
              </p>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">{t("report.noHistory")}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function LogisticsTab() {
  const { view, calc, assumptions } = useReport();
  const t = useT();
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
          <CardTitle className="text-base">{t("report.transport")}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="divide-y">
            <Row k={t("report.yard")} v={[l.location.yardName, l.location.city, l.location.state, l.location.zip].filter(Boolean).join(", ")} />
            <Row k={t("report.deliveredTo")} v={lg.userZip ? t("report.zip", { zip: lg.userZip }) : "—"} />
            <Row
              k={t("report.distance")}
              v={`${formatNumber(assumptions.distanceOverride ?? lg.distanceMiles)} mi${lg.method === "DEFAULT" ? t("report.estimated") : ""}`}
            />
            <Row
              k={t("report.rate")}
              v={t("report.rateValue", { rate: (assumptions.transportCentsPerMile / 100).toFixed(2), min: formatUsd(assumptions.transportMin) })}
            />
            <Row k={t("report.transportCost")} v={formatUsd(calc.scenarios.expected.logistics)} />
            <Row k={t("report.titleInspection")} v={formatUsd(calc.scenarios.expected.admin)} />
          </dl>
        </CardContent>
      </Card>
      {ec && base.exportProfile && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("report.exportTo", { name: base.exportProfile.name })}</CardTitle>
            {base.exportProfile.isPlaceholder && <p className="text-caution text-xs">{t("report.placeholderProfile")}</p>}
          </CardHeader>
          <CardContent>
            <dl className="divide-y">
              <Row k={t("report.inlandToPort")} v={formatUsd(ec.inlandToPort)} />
              <Row k={t("report.portLoading")} v={formatUsd(ec.portAndLoading)} />
              <Row k={t("report.oceanFreight")} v={formatUsd(ec.oceanFreight)} />
              <Row k={t("report.destPort")} v={formatUsd(ec.destinationPortFees + ec.customsBrokerFee)} />
              <Row k={t("report.customsDuty")} v={t("report.ofCif", { pct: ec.dutyBps / 100 })} />
              <Row k={t("report.vat")} v={ec.vatRecoverable ? t("report.recoverable") : t("report.ofCifDuty", { pct: ec.vatBps / 100 })} />
              <Row k={t("report.registration")} v={formatUsd(ec.registrationTax)} />
              <Row k={t("report.compliance")} v={formatUsd(ec.complianceConversion)} />
              <Row k={t("report.deliveryFromPort")} v={formatUsd(ec.deliveryFromPort)} />
              <Row k={t("report.dutyVatAtMax")} v={formatUsd((calc.acquisitionAtMaxBid?.duty ?? 0) + (calc.acquisitionAtMaxBid?.vat ?? 0))} />
            </dl>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
