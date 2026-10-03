"use client";

import { ArrowRightIcon, ChevronDownIcon, Loader2Icon, SparklesIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DemoLot } from "@/lib/config/demo";
import { useT } from "@/lib/i18n/client";
import { trText } from "@/lib/i18n/generated";
import { demoLotLabel, parsedLabel, parsedWarnings } from "@/lib/i18n/labels";
import { rich } from "@/lib/i18n/rich";
import { parseInput } from "@/lib/input/parseInput";
import type { ManualListing } from "@/lib/pipeline/types";
import { cn } from "@/lib/utils";

import { ManualFields } from "./manual-fields";
import { PhotoUpload } from "./photo-upload";

export function AnalyzeBar({ demoLots, initialInput = "" }: { demoLots: DemoLot[]; initialInput?: string }) {
  const router = useRouter();
  const t = useT();
  const [input, setInput] = useState(initialInput);
  const [url, setUrl] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [manual, setManual] = useState<ManualListing>({});
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const parsed = useMemo(() => parseInput(input), [input]);
  const manualFilled = Object.values(manual).some((v) => v !== null && v !== undefined && v !== "");
  const canSubmit = parsed.type !== "INVALID" || manualFilled || photos.length > 0;

  async function submit(value?: string) {
    const text = value ?? input;
    setBusy(true);
    try {
      const p = parseInput(text);
      const useManual = p.type === "INVALID" && (manualFilled || photos.length > 0);
      const res = await fetch("/api/analyses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          input: text,
          mode: useManual ? "MANUAL" : "auto",
          manual: manualFilled ? manual : null,
          photos,
          url: p.type === "TEXT" && url ? url : null,
        }),
      });
      const body = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !body.id) {
        if (res.status === 402)
          toast.error(body.error ? trText(t, body.error) : t("analyze.outOfCredits"), {
            action: { label: t("analyze.upgrade"), onClick: () => router.push("/app/billing") },
          });
        else toast.error(body.error ? trText(t, body.error) : t("analyze.couldNotStart"));
        setBusy(false);
        return;
      }
      router.push(`/app/analyses/${body.id}`);
    } catch {
      toast.error(t("analyze.network"));
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) void submit();
        }}
        className="bg-card focus-within:ring-ring/40 rounded-xl border p-2 shadow-sm focus-within:ring-[3px]"
      >
        <Textarea
          aria-label={t("analyze.inputLabel")}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && parsed.type !== "TEXT") {
              e.preventDefault();
              if (canSubmit) void submit();
            }
          }}
          rows={input.length > 120 ? 6 : 2}
          placeholder={t("analyze.placeholder")}
          className="min-h-14 resize-none border-0 bg-transparent px-2 text-base shadow-none focus-visible:ring-0 dark:bg-transparent"
        />
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 pt-1">
          <div
            className={cn("flex min-w-0 items-center gap-1.5 text-xs", parsed.type === "INVALID" ? "text-muted-foreground" : "text-primary")}
            aria-live="polite"
          >
            {input.trim() ? (
              <>
                {parsed.type !== "INVALID" && <SparklesIcon className="size-3.5 shrink-0" />}
                <span className="truncate">{parsedLabel(t, parsed, input)}</span>
              </>
            ) : (
              <span className="text-muted-foreground">{t("analyze.hint")}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setMore((m) => !m)} aria-expanded={more}>
              {t("analyze.moreOptions")} <ChevronDownIcon className={cn("transition-transform", more && "rotate-180")} />
            </Button>
            <Button type="submit" disabled={!canSubmit || busy} size="sm" className="min-w-28">
              {busy ? <Loader2Icon className="animate-spin" /> : <ArrowRightIcon />}
              {busy ? t("analyze.starting") : t("analyze.analyze")}
            </Button>
          </div>
        </div>
        {parsed.warnings.length > 0 && <p className="text-caution px-2 pt-1 text-xs">{parsedWarnings(t, parsed).join(" ")}</p>}
      </form>

      {more && (
        <div className="bg-card space-y-4 rounded-xl border p-4">
          {parsed.type === "TEXT" && (
            <div className="space-y-1.5">
              <Label htmlFor="src-url">{t("analyze.listingLink")}</Label>
              <Input id="src-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.copart.com/lot/…" />
            </div>
          )}
          <PhotoUpload value={photos} onChange={setPhotos} />
          <div className="space-y-2">
            <div className="text-sm font-medium">{t("analyze.orEnter")}</div>
            <ManualFields value={manual} onChange={setManual} />
          </div>
        </div>
      )}

      {demoLots.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-xs">{t("analyze.tryDemo")}</span>
          {demoLots.map((lot) => (
            <DemoChip
              key={lot.id}
              lot={lot}
              disabled={busy}
              onPick={() => {
                setInput(lot.url);
                void submit(lot.url);
              }}
            />
          ))}
        </div>
      )}
      <p className="text-muted-foreground text-xs">
        {rich(t("analyze.blocked"), {
          ctrlA: (
            <>
              <kbd className="rounded border px-1">Ctrl</kbd>+<kbd className="rounded border px-1">A</kbd>
            </>
          ),
          ctrlC: (
            <>
              <kbd className="rounded border px-1">Ctrl</kbd>+<kbd className="rounded border px-1">C</kbd>
            </>
          ),
          extension: (
            <Link href="/app/settings#extension" className="underline">
              {t("analyze.extension")}
            </Link>
          ),
        })}
      </p>
    </div>
  );
}

function DemoChip({ lot, disabled, onPick }: { lot: DemoLot; disabled: boolean; onPick: () => void }) {
  const t = useT();
  const { label, description } = demoLotLabel(t, lot);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onPick}
      title={description}
      className="bg-background hover:border-primary hover:text-primary rounded-full border px-3 py-1 text-xs transition-colors disabled:opacity-50"
    >
      {label}
    </button>
  );
}
