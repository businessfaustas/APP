"use client";

import { CheckIcon, XIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ZONE_LABELS } from "@/lib/domain/damageZones";
import type { DamageZone } from "@/lib/domain/schemas";
import { cn } from "@/lib/utils";

import { DamageZoneMap, zoneSeverities } from "./damage-zone-map";
import { PhotoGallery } from "./photo-gallery";
import { useReport } from "./report-context";

const ANGLES = ["front", "rear", "left", "right", "engine_bay", "interior_front", "undercarriage", "dashboard_odometer"] as const;
const ANGLE_LABEL: Record<(typeof ANGLES)[number], string> = {
  front: "Front",
  rear: "Rear",
  left: "Left side",
  right: "Right side",
  engine_bay: "Engine bay",
  interior_front: "Interior",
  undercarriage: "Undercarriage",
  dashboard_odometer: "Odometer",
};

export function DamageTab() {
  const { view, lineItems } = useReport();
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
            <CardTitle className="text-base">Damage map</CardTitle>
          </CardHeader>
          <CardContent>
            <DamageZoneMap severities={severities} selected={zone} onSelect={setZone} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Photo coverage</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-2 gap-1.5 text-sm">
              {ANGLES.map((a) => (
                <li key={a} className="flex items-center gap-1.5">
                  {present.has(a) ? <CheckIcon className="text-go size-3.5" /> : <XIcon className="text-stop size-3.5" />}
                  <span className={cn(!present.has(a) && "text-muted-foreground")}>{ANGLE_LABEL[a]}</span>
                </li>
              ))}
            </ul>
            <p className="text-muted-foreground mt-2 text-xs">Image quality: {d.photo_coverage.image_quality}</p>
          </CardContent>
        </Card>
      </div>
      <div className="min-w-0 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">What the AI saw</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>{d.summary}</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant={d.severity_score >= 7 ? "stop" : d.severity_score >= 4 ? "caution" : "go"}>Severity {d.severity_score}/10</Badge>
              <Badge variant="outline">Confidence {Math.round(d.overall_confidence * 100)}%</Badge>
              <Badge variant={d.airbag_deployed ? "caution" : "outline"}>
                {d.airbag_deployed ? `Airbags: ${d.airbags_deployed_list.join(", ") || "deployed"}` : "Airbags intact"}
              </Badge>
              <Badge variant={d.frame_damage_suspected ? "stop" : "outline"}>
                {d.frame_damage_suspected ? "Frame damage suspected" : "No frame damage seen"}
              </Badge>
              {d.flood_indicators.length > 0 && <Badge variant="stop">Flood indicators</Badge>}
              {d.engine_bay_intact === false && <Badge variant="stop">Engine bay damaged</Badge>}
            </div>
            {d.frame_evidence && <p className="text-muted-foreground text-xs">Frame evidence: {d.frame_evidence}</p>}
            {!view.damageFromPhotos && (
              <p className="bg-caution-soft rounded-md px-3 py-2 text-xs">
                These findings come from the listing&apos;s damage description, not the photos. Review the repair lines.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Photos{zone ? ` — ${ZONE_LABELS[zone]}` : ""}</CardTitle>
            {zone && (
              <button type="button" className="text-muted-foreground text-xs underline" onClick={() => setZone(null)}>
                Show all
              </button>
            )}
          </CardHeader>
          <CardContent>
            <PhotoGallery photos={view.photos} findings={findings} highlight={highlight} />
            {view.photos.some((p) => p.url.startsWith("/demo-photos/")) && (
              <p className="text-muted-foreground mt-2 text-xs">Demo lots use illustrative drawings, not real auction photos.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{zone ? `Parts — ${ZONE_LABELS[zone]}` : "Damaged parts & hidden risks"}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {zoneLines.map((l) => (
                <li key={l.id} className="flex items-start justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <div className="font-medium">{l.partName}</div>
                    <div className="text-muted-foreground text-xs">
                      {ZONE_LABELS[l.zone]} · {l.action.toLowerCase()}
                      {l.reason ? ` · ${l.reason}` : ""}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    {l.origin === "VISIBLE" ? (
                      <Badge variant="outline">Visible{l.photoRefs.length ? ` · photo ${l.photoRefs.join(", ")}` : ""}</Badge>
                    ) : l.origin === "HIDDEN_LIKELY" ? (
                      <Badge variant="caution">Likely hidden · {Math.round(l.probability * 100)}%</Badge>
                    ) : (
                      <Badge variant="info">Added by rule</Badge>
                    )}
                  </div>
                </li>
              ))}
              {zoneLines.length === 0 && <li className="text-muted-foreground py-2">No parts in this zone.</li>}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
