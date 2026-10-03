"use client";

import { CheckIcon, Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { ManualFields, QuickFields } from "@/components/input/manual-fields";
import { PhotoUpload } from "@/components/input/photo-upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { Progress, SegmentedControl } from "@/components/ui/misc";
import type { AnalysisView } from "@/lib/analysis/view";
import { useT } from "@/lib/i18n/client";
import { trText } from "@/lib/i18n/generated";
import { PROGRESS_STEPS } from "@/lib/pipeline/types";
import type { ManualListing } from "@/lib/pipeline/types";
import { cn } from "@/lib/utils";

export function AnalysisProgress({ view }: { view: AnalysisView }) {
  const t = useT();
  const photoCount = view.listing?.photoUrls.length ?? 0;
  const step = view.currentStep ?? view.status;
  const car = view.listing ? ` ${[view.listing.year, view.listing.make, view.listing.model].filter(Boolean).join(" ")}` : "";
  return (
    <Card className="mx-auto max-w-xl" data-testid="analysis-progress">
      <CardHeader>
        <CardTitle className="text-lg">{t("report.analyzing", { car })}</CardTitle>
        <p className="text-muted-foreground text-sm">{t.dyn(`gen.steps.${step}`, undefined, view.stepLabel)}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <Progress value={view.progress} aria-label={t("report.progressAria")} />
        <ol className="space-y-2.5">
          {PROGRESS_STEPS.map((s) => {
            const done = view.progress >= s.at && view.currentStep !== s.key;
            const active = view.currentStep === s.key || (!done && view.progress >= s.at - 15 && view.progress < s.at);
            const label = s.key === "vision-audit" && photoCount ? t("report.analyzingPhotos", { n: photoCount }) : t(`report.progressStep.${s.key}`);
            return (
              <li key={s.key} className="flex items-center gap-2.5 text-sm">
                <span
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full border",
                    done && "border-go bg-go text-background",
                    active && "border-primary",
                  )}
                >
                  {done ? <CheckIcon className="size-3" /> : active ? <Loader2Icon className="text-primary size-3 animate-spin" /> : null}
                </span>
                <span className={cn(!done && !active && "text-muted-foreground")}>{label}</span>
              </li>
            );
          })}
        </ol>
        <p className="text-muted-foreground text-xs">{t("report.progressNote")}</p>
      </CardContent>
    </Card>
  );
}

function describePrefill(p: ManualListing): string {
  const car = [p.year, p.make, p.model, p.trim].filter(Boolean).join(" ");
  const place = p.city && p.state ? `${p.city}, ${p.state}` : (p.state ?? "");
  return [car || (p.vin ? `VIN ${p.vin}` : ""), p.titleRaw?.toLowerCase(), place].filter(Boolean).join(" · ");
}

export function NeedsInputForm({ view, onResumed }: { view: AnalysisView; onResumed: () => void }) {
  const router = useRouter();
  const t = useT();
  const prefill = view.inputPrefill;
  const known = Boolean(prefill && (prefill.vin || (prefill.year && prefill.make && prefill.model)));
  const [mode, setMode] = useState<"details" | "text">(known ? "details" : "text");
  const [text, setText] = useState("");
  const [manual, setManual] = useState<ManualListing>({ ...(prefill ?? {}), vin: prefill?.vin ?? view.listing?.vin ?? null });
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (mode === "text" && !text.trim()) return void toast.error(t("report.pasteFirst"));
    if (mode === "details") {
      if (!manual.vin && !(manual.year && manual.make && manual.model)) return void toast.error(t("report.needIdentity"));
      if (!manual.primaryDamage && photos.length === 0) return void toast.error(t("report.needDamage"));
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/analyses/${view.id}/resume`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(mode === "text" ? { text, manual: null, photos } : { text: null, manual, photos }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? t("report.couldNotContinue"));
      onResumed();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? trText(t, err.message) : t("report.couldNotContinue"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mx-auto max-w-2xl" data-testid="needs-input">
      <CardHeader>
        <CardTitle className="text-lg">{known ? t("report.addFewDetails") : t("report.needListing")}</CardTitle>
        <p className="text-muted-foreground text-sm">{trText(t, view.error)}</p>
        {known && prefill && (
          <p className="bg-muted mt-2 rounded-md px-3 py-2 text-sm font-medium" data-testid="prefill-summary">
            {describePrefill(prefill)}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        <SegmentedControl
          ariaLabel={t("report.howToAdd")}
          value={mode}
          onValueChange={setMode}
          options={[
            { value: "details", label: t("report.fillDetails") },
            { value: "text", label: t("report.pasteText") },
          ]}
        />
        {mode === "details" ? (
          known ? (
            <div className="space-y-3">
              <QuickFields value={manual} onChange={setManual} />
              <details className="rounded-lg border p-3">
                <summary className="cursor-pointer text-sm font-medium">{t("report.moreDetails")}</summary>
                <div className="pt-3">
                  <ManualFields value={manual} onChange={setManual} />
                </div>
              </details>
            </div>
          ) : (
            <ManualFields value={manual} onChange={setManual} />
          )
        ) : (
          <div className="space-y-1.5">
            <p className="text-muted-foreground text-xs">{t("report.pasteHelp")}</p>
            <Textarea
              aria-label={t("report.lotText")}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              placeholder={t("report.lotTextPlaceholder")}
            />
          </div>
        )}
        <PhotoUpload value={photos} onChange={setPhotos} />
        <Button onClick={() => void submit()} disabled={busy} className="w-full sm:w-auto">
          {busy && <Loader2Icon className="animate-spin" />} {t("report.analyzeThisLot")}
        </Button>
      </CardContent>
    </Card>
  );
}
