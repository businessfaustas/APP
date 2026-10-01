"use client";

import { Loader2Icon, LayoutGridIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DemoLot } from "@/lib/config/demo";
import { parseInput } from "@/lib/input/parseInput";

export function NewBatchForm({ demoLots }: { demoLots: DemoLot[] }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const invalid = lines.filter((l) => parseInput(l).type !== "URL" && parseInput(l).type !== "VIN");

  async function submit(inputs: string[]) {
    setBusy(true);
    try {
      const res = await fetch("/api/batches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ inputs, name: name || null }),
      });
      const body = (await res.json()) as { batchId?: string; error?: string };
      if (!res.ok || !body.batchId) throw new Error(body.error ?? "Couldn't start the comparison");
      router.push(`/app/compare/${body.batchId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="batch-links">Links or VINs — one per line, up to 10</Label>
          <Textarea
            id="batch-links"
            rows={7}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"https://www.copart.com/lot/…\nhttps://www.iaai.com/VehicleDetail/…\nhttps://bid.cars/en/lot/…"}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{lines.length}/10 lots · 1 credit each</span>
            {invalid.length > 0 && <span className="text-caution">{invalid.length} line(s) aren&apos;t links or VINs</span>}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="batch-name">Name (optional)</Label>
          <Input id="batch-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. A3s this week" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void submit(lines)} disabled={busy || lines.length === 0 || lines.length > 10 || invalid.length > 0}>
            {busy ? <Loader2Icon className="animate-spin" /> : <LayoutGridIcon />} Compare {lines.length || ""} lots
          </Button>
          {demoLots.length > 0 && (
            <Button variant="outline" disabled={busy} onClick={() => void submit(demoLots.slice(0, 3).map((d) => d.url))}>
              Compare 3 demo lots
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
