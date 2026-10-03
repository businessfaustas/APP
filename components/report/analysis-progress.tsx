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
import { PROGRESS_STEPS } from "@/lib/pipeline/types";
import type { ManualListing } from "@/lib/pipeline/types";
import { cn } from "@/lib/utils";

export function AnalysisProgress({ view }: { view: AnalysisView }) {
  const photoCount = view.listing?.photoUrls.length ?? 0;
  return (
    <Card className="mx-auto max-w-xl" data-testid="analysis-progress">
      <CardHeader>
        <CardTitle className="text-lg">
          Analyzing{view.listing ? ` ${[view.listing.year, view.listing.make, view.listing.model].filter(Boolean).join(" ")}` : ""}…
        </CardTitle>
        <p className="text-muted-foreground text-sm">{view.stepLabel}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <Progress value={view.progress} aria-label="Analysis progress" />
        <ol className="space-y-2.5">
          {PROGRESS_STEPS.map((s) => {
            const done = view.progress >= s.at && view.currentStep !== s.key;
            const active = view.currentStep === s.key || (!done && view.progress >= s.at - 15 && view.progress < s.at);
            const label = s.key === "vision-audit" && photoCount ? `Analyzing ${photoCount} photos` : s.label;
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
        <p className="text-muted-foreground text-xs">Usually under a minute. You can leave this page — the report will be in your history.</p>
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
  const prefill = view.inputPrefill;
  const known = Boolean(prefill && (prefill.vin || (prefill.year && prefill.make && prefill.model)));
  const [mode, setMode] = useState<"details" | "text">(known ? "details" : "text");
  const [text, setText] = useState("");
  const [manual, setManual] = useState<ManualListing>({ ...(prefill ?? {}), vin: prefill?.vin ?? view.listing?.vin ?? null });
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (mode === "text" && !text.trim()) return void toast.error("Paste the lot page text first.");
    if (mode === "details") {
      if (!manual.vin && !(manual.year && manual.make && manual.model)) return void toast.error("Add the VIN, or the year, make and model.");
      if (!manual.primaryDamage && photos.length === 0) return void toast.error("Choose the primary damage so we can estimate repairs.");
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/analyses/${view.id}/resume`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(mode === "text" ? { text, manual: null, photos } : { text: null, manual, photos }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Couldn't continue");
      onResumed();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't continue");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mx-auto max-w-2xl" data-testid="needs-input">
      <CardHeader>
        <CardTitle className="text-lg">{known ? "Add a few details to finish" : "We need the listing details"}</CardTitle>
        <p className="text-muted-foreground text-sm">{view.error}</p>
        {known && prefill && (
          <p className="bg-muted mt-2 rounded-md px-3 py-2 text-sm font-medium" data-testid="prefill-summary">
            {describePrefill(prefill)}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        <SegmentedControl
          ariaLabel="How to add the details"
          value={mode}
          onValueChange={setMode}
          options={[
            { value: "details", label: "Fill in details" },
            { value: "text", label: "Paste page text" },
          ]}
        />
        {mode === "details" ? (
          known ? (
            <div className="space-y-3">
              <QuickFields value={manual} onChange={setManual} />
              <details className="rounded-lg border p-3">
                <summary className="cursor-pointer text-sm font-medium">More details (optional)</summary>
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
            <p className="text-muted-foreground text-xs">
              On the lot page press Ctrl+A then Ctrl+C (⌘A, ⌘C on Mac) and paste here. You don&apos;t need to clean it up.
            </p>
            <Textarea
              aria-label="Lot page text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              placeholder="Lot #… VIN… Odometer… Primary damage… Est. retail value…"
            />
          </div>
        )}
        <PhotoUpload value={photos} onChange={setPhotos} />
        <Button onClick={() => void submit()} disabled={busy} className="w-full sm:w-auto">
          {busy && <Loader2Icon className="animate-spin" />} Analyze this lot
        </Button>
      </CardContent>
    </Card>
  );
}
