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
import { parseInput } from "@/lib/input/parseInput";
import type { ManualListing } from "@/lib/pipeline/types";
import { cn } from "@/lib/utils";

import { ManualFields } from "./manual-fields";
import { PhotoUpload } from "./photo-upload";

export function AnalyzeBar({ demoLots, initialInput = "" }: { demoLots: DemoLot[]; initialInput?: string }) {
  const router = useRouter();
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
        if (res.status === 402) toast.error(body.error ?? "Out of credits", { action: { label: "Upgrade", onClick: () => router.push("/app/billing") } });
        else toast.error(body.error ?? "Couldn't start the analysis");
        setBusy(false);
        return;
      }
      router.push(`/app/analyses/${body.id}`);
    } catch {
      toast.error("Network error — try again.");
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
          aria-label="Auction link, VIN or listing text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && parsed.type !== "TEXT") {
              e.preventDefault();
              if (canSubmit) void submit();
            }
          }}
          rows={input.length > 120 ? 6 : 2}
          placeholder="Paste a Copart / IAAI / Bid.cars link, a VIN, or the whole listing text…"
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
                <span className="truncate">{parsed.label}</span>
              </>
            ) : (
              <span className="text-muted-foreground">Links, VINs and pasted listing text all work.</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setMore((m) => !m)} aria-expanded={more}>
              More options <ChevronDownIcon className={cn("transition-transform", more && "rotate-180")} />
            </Button>
            <Button type="submit" disabled={!canSubmit || busy} size="sm" className="min-w-28">
              {busy ? <Loader2Icon className="animate-spin" /> : <ArrowRightIcon />}
              {busy ? "Starting…" : "Analyze"}
            </Button>
          </div>
        </div>
        {parsed.warnings.length > 0 && <p className="text-caution px-2 pt-1 text-xs">{parsed.warnings.join(" ")}</p>}
      </form>

      {more && (
        <div className="bg-card space-y-4 rounded-xl border p-4">
          {parsed.type === "TEXT" && (
            <div className="space-y-1.5">
              <Label htmlFor="src-url">Listing link (optional)</Label>
              <Input id="src-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.copart.com/lot/…" />
            </div>
          )}
          <PhotoUpload value={photos} onChange={setPhotos} />
          <div className="space-y-2">
            <div className="text-sm font-medium">Or enter the details yourself</div>
            <ManualFields value={manual} onChange={setManual} />
          </div>
        </div>
      )}

      {demoLots.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-xs">Try a demo lot:</span>
          {demoLots.map((lot) => (
            <button
              key={lot.id}
              type="button"
              disabled={busy}
              onClick={() => {
                setInput(lot.url);
                void submit(lot.url);
              }}
              title={lot.description}
              className="bg-background hover:border-primary hover:text-primary rounded-full border px-3 py-1 text-xs transition-colors disabled:opacity-50"
            >
              {lot.label}
            </button>
          ))}
        </div>
      )}
      <p className="text-muted-foreground text-xs">
        Fetching blocked? Open the lot, press <kbd className="rounded border px-1">Ctrl</kbd>+<kbd className="rounded border px-1">A</kbd>,{" "}
        <kbd className="rounded border px-1">Ctrl</kbd>+<kbd className="rounded border px-1">C</kbd> and paste the text here — or use the{" "}
        <Link href="/app/settings#extension" className="underline">
          browser extension
        </Link>
        .
      </p>
    </div>
  );
}
