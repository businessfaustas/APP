"use client";

import { CheckIcon, CopyIcon, Loader2Icon, PlugZapIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Runs the live check for one integration and shows the answer inline. */
export function TestButton({ integration }: { integration: string }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  async function run() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/integrations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key: integration }),
      });
      const body = (await res.json()) as { ok?: boolean; message?: string; error?: string };
      setResult({ ok: Boolean(body.ok), message: body.message ?? body.error ?? `HTTP ${res.status}` });
    } catch {
      setResult({ ok: false, message: "Network error." });
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="outline" onClick={() => void run()} disabled={busy} data-testid={`test-${integration}`}>
        {busy ? <Loader2Icon className="animate-spin" /> : <PlugZapIcon />} Test
      </Button>
      {result && (
        <span className={cn("text-xs", result.ok ? "text-go" : "text-stop")} role="status">
          {result.message}
        </span>
      )}
    </div>
  );
}

/** A variable name you can copy into the hosting dashboard. */
export function VarChip({ name, set, optional }: { name: string; set: boolean; optional?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title={set ? "Set" : optional ? "Optional — not set" : "Missing"}
      onClick={() =>
        void navigator.clipboard.writeText(name).then(() => {
          setCopied(true);
          toast.success(`Copied ${name}`);
          setTimeout(() => setCopied(false), 1500);
        })
      }
      className={cn(
        "group inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[11px] transition-colors",
        set ? "border-go/30 bg-go-soft text-go" : optional ? "text-muted-foreground border-dashed" : "border-caution/40 bg-caution-soft text-caution",
      )}
    >
      <span className={cn("size-1.5 rounded-full", set ? "bg-go" : optional ? "bg-muted-foreground/50" : "bg-caution")} aria-hidden="true" />
      {name}
      {copied ? <CheckIcon className="size-3" /> : <CopyIcon className="size-3 opacity-0 transition-opacity group-hover:opacity-70" />}
    </button>
  );
}
