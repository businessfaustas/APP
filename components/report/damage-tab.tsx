"use client";

import { CheckIcon, XIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DamageZone } from "@/lib/domain/schemas";
import { useT } from "@/lib/i18n/client";
import { trPart, trText } from "@/lib/i18n/generated";
import { cn } from "@/lib/utils";

import { DamageZoneMap, zoneSeverities } from "./damage-zone-map";
import { PhotoGallery } from "./photo-gallery";
import { useReport } from "./report-context";

const ANGLES = ["front", "rear", "left", "right", "engine_bay", "interior_front", "undercarriage", "dashboard_odometer"] as const;

export function DamageTab() {
  const { view, lineItems } = useReport();
  const t = useT();
  const d = view.damage;
  const [zone, setZone] = useState<DamageZone | null>(null);
  const severities = useMemo(() => zoneSeverities(d, lineItems), [d, lineItems]);
  const findings = useMemo(() => new Map((d?.photos ?? []).map((p) => [p.index, p.findings])), [d]);
  const zoneLines = lineItems.filter((l) => zone === null || l.zone === zone);
  const highlight = useMemo(() => (zone === null ? null : new Set(lineItems.filter((l) => l.zone === zone).flatMap((l) => l.photoRefs))), [zone, lineItems]);
  if (!d) return null;
  const present = new Set(
    d.photo_coverage.angles_present.map((a) => (a === "front_left" || a === "front_right" ? "front" : a === "rear_left" || a === "rear_right" ? "rear" : a)),
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("report.damageMap")}</CardTitle>
          </CardHeader>
          <CardContent>
            <DamageZoneMap severities={severities} selected={zone} onSelect={setZone} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("report.photoCoverage")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-2 gap-1.5 text-sm">
              {ANGLES.map((a) => (
                <li key={a} className="flex items-center gap-1.5">
                  {present.has(a) ? <CheckIcon className="text-go size-3.5" /> : <XIcon className="text-stop size-3.5" />}
                  <span className={cn(!present.has(a) && "text-muted-foreground")}>{t(`report.angle.${a}`)}</span>
                </li>
              ))}
            </ul>
            <p className="text-muted-foreground mt-2 text-xs">{t("report.imageQuality", { q: t(`report.quality.${d.photo_coverage.image_quality}`) })}</p>
          </CardContent>
        </Card>
      </div>
      <div className="min-w-0 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("report.whatAiSaw")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>{trText(t, d.summary)}</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant={d.severity_score >= 7 ? "stop" : d.severity_score >= 4 ? "caution" : "go"}>{t("report.severity", { n: d.severity_score })}</Badge>
              <Badge variant="outline">{t("report.confidence", { pct: Math.round(d.overall_confidence * 100) })}</Badge>
              <Badge variant={d.airbag_deployed ? "caution" : "outline"}>
                {d.airbag_deployed ? t("report.airbags", { list: d.airbags_deployed_list.join(", ") || t("report.deployed") }) : t("report.airbagsIntact")}
              </Badge>
              <Badge variant={d.frame_damage_suspected ? "stop" : "outline"}>
                {d.frame_damage_suspected ? t("report.frameSuspected") : t("report.noFrame")}
              </Badge>
              {d.flood_indicators.length > 0 && <Badge variant="stop">{t("report.floodIndicators")}</Badge>}
              {d.engine_bay_intact === false && <Badge variant="stop">{t("report.engineBayDamaged")}</Badge>}
            </div>
            {d.frame_evidence && <p className="text-muted-foreground text-xs">{t("report.frameEvidence", { text: trText(t, d.frame_evidence) })}</p>}
            {!view.damageFromPhotos && <p className="bg-caution-soft rounded-md px-3 py-2 text-xs">{t("report.fromDescription")}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">
              {t("report.photos")}
              {zone ? ` — ${t(`report.zone.${zone}`)}` : ""}
            </CardTitle>
            {zone && (
              <button type="button" className="text-muted-foreground text-xs underline" onClick={() => setZone(null)}>
                {t("report.showAll")}
              </button>
            )}
          </CardHeader>
          <CardContent>
            <PhotoGallery photos={view.photos} findings={findings} highlight={highlight} />
            {view.photos.some((p) => p.url.startsWith("/demo-photos/")) && <p className="text-muted-foreground mt-2 text-xs">{t("report.demoPhotos")}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{zone ? t("report.partsIn", { zone: t(`report.zone.${zone}`) }) : t("report.partsAndHidden")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {zoneLines.map((l) => (
                <li key={l.id} className="flex items-start justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <div className="font-medium">{trPart(t, l.partName)}</div>
                    <div className="text-muted-foreground text-xs">
                      {t(`report.zone.${l.zone}`)} · {t(`report.action.${l.action}`)}
                      {l.reason ? ` · ${trText(t, l.reason)}` : ""}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    {l.origin === "VISIBLE" ? (
                      <Badge variant="outline">
                        {t("report.visible")}
                        {l.photoRefs.length ? t("report.photoRefs", { refs: l.photoRefs.join(", ") }) : ""}
                      </Badge>
                    ) : l.origin === "HIDDEN_LIKELY" ? (
                      <Badge variant="caution">{t("report.likelyHidden", { pct: Math.round(l.probability * 100) })}</Badge>
                    ) : (
                      <Badge variant="info">{t("report.addedByRule")}</Badge>
                    )}
                  </div>
                </li>
              ))}
              {zoneLines.length === 0 && <li className="text-muted-foreground py-2">{t("report.noPartsZone")}</li>}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
