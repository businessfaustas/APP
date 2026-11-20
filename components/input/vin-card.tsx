"use client";

import { useEffect, useState } from "react";

import type { VinPreview } from "@/app/api/vin/[vin]/route";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

/** The 17 characters of a VIN as a stamped plate: maker code, descriptor, the check digit, then the serial. */
export function VinPlate({ vin, checkDigitOk }: { vin: string; checkDigitOk: boolean }) {
  return (
    <div className="grid max-w-md grid-cols-[repeat(17,minmax(0,1fr))] gap-0.5" role="img" aria-label={`VIN ${vin}`}>
      {[...vin].map((ch, i) => (
        <span
          key={i}
          className={cn(
            "num grid aspect-[3/4] place-items-center rounded-[3px] border text-[11px] font-semibold sm:text-xs",
            i < 3 && "border-primary/50 bg-primary/10 text-primary",
            i === 8 && (checkDigitOk ? "border-go/60 text-go" : "border-caution/70 text-caution"),
            i !== 8 && i >= 3 && "bg-muted/60 text-foreground/85 border-transparent",
          )}
        >
          {ch}
        </span>
      ))}
    </div>
  );
}

/** What a VIN decodes to, shown under the analyze box before anything is run or charged. */
export function VinCard({ vin }: { vin: string }) {
  const t = useT();
  const [state, setState] = useState<{ vin: string; preview: VinPreview | null } | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/vin/${vin}`, { signal: ctrl.signal })
      .then(async (res) => (res.ok ? ((await res.json()) as VinPreview) : null))
      .then((preview) => setState({ vin, preview }))
      .catch((err: unknown) => {
        if (!(err instanceof DOMException && err.name === "AbortError")) setState({ vin, preview: null });
      });
    return () => ctrl.abort();
  }, [vin]);

  const current = state?.vin === vin ? state : null;
  const preview = current?.preview ?? null;
  const car = preview?.car ?? null;
  const specs = car ? [car.engine, car.drive, car.body, car.fuel].filter((s): s is string => Boolean(s)) : [];

  return (
    <div className="bg-card space-y-3 rounded-xl border p-4" data-testid="vin-card" aria-live="polite">
      <VinPlate vin={vin} checkDigitOk={preview?.checkDigitOk ?? true} />
      {!current ? (
        <p className="text-muted-foreground text-sm">{t("analyze.vinChecking")}</p>
      ) : car ? (
        <div className="space-y-1.5">
          <div className="display text-xl font-semibold tracking-tight" data-testid="vin-car">
            {[car.year, car.make, car.model, car.trim].filter(Boolean).join(" ")}
          </div>
          {specs.length > 0 && <p className="text-muted-foreground text-sm">{specs.join(" · ")}</p>}
          <p className="text-muted-foreground text-xs">{t("analyze.vinNext")}</p>
        </div>
      ) : (
        <p className="text-caution text-sm">{preview?.reason === "unavailable" ? t("analyze.vinUnavailable") : t("analyze.vinUnknown")}</p>
      )}
    </div>
  );
}
