"use client";

import { CheckIcon, CopyIcon, Loader2Icon, PackagePlusIcon, WebhookIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

interface PriceRow {
  item: string;
  name: string;
  priceId: string;
  status: "created" | "exists" | "mismatch";
  note?: string;
}
interface Webhook {
  url: string;
  created: boolean;
  secret: string | null;
  addedEvents: string[];
}

const STATUS: Record<PriceRow["status"], string> = { created: "created", exists: "already there", mismatch: "needs attention" };

/** Admin-only buttons that set up the shop in Stripe (the account the server's key belongs to). Safe to press again. */
export function StripeTools() {
  const [busy, setBusy] = useState<"prices" | "webhook" | null>(null);
  const [prices, setPrices] = useState<PriceRow[] | null>(null);
  const [webhook, setWebhook] = useState<Webhook | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function run(action: "create-prices" | "create-webhook") {
    setBusy(action === "create-prices" ? "prices" : "webhook");
    setError(null);
    try {
      const res = await fetch("/api/admin/stripe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action }) });
      const body = (await res.json()) as { error?: string; prices?: PriceRow[]; webhook?: Webhook };
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      if (body.prices) setPrices(body.prices);
      if (body.webhook) setWebhook(body.webhook);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setBusy(null);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // the field is selectable, so it can still be copied by hand
    }
  }

  return (
    <div className="bg-surface-2 mt-3 space-y-3 rounded-xl border p-4" data-testid="stripe-tools">
      <div>
        <p className="text-sm font-medium">Set up the shop in Stripe</p>
        <p className="text-muted-foreground text-xs">
          Creates the 5 products with their prices, descriptions and what the customer gets, and the webhook that delivers credits after a payment, in the
          Stripe account your key belongs to (test or live). Press again any time: nothing is duplicated.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => void run("create-prices")} disabled={busy !== null} data-testid="stripe-create-prices">
          {busy === "prices" ? <Loader2Icon className="animate-spin" /> : <PackagePlusIcon />} Create prices
        </Button>
        <Button size="sm" variant="outline" onClick={() => void run("create-webhook")} disabled={busy !== null} data-testid="stripe-create-webhook">
          {busy === "webhook" ? <Loader2Icon className="animate-spin" /> : <WebhookIcon />} Create webhook
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-stop text-xs">
          {error}
        </p>
      )}
      {prices && (
        <ul className="space-y-1 text-xs" data-testid="stripe-prices-result">
          {prices.map((p) => (
            <li key={p.item} className={p.status === "mismatch" ? "text-stop" : undefined}>
              <span className="font-medium">{p.name}</span> — {STATUS[p.status]} <code className="text-muted-foreground">{p.priceId}</code>
              {p.note && <span className="block">{p.note}</span>}
            </li>
          ))}
        </ul>
      )}
      {webhook && (
        <div className="space-y-2 text-xs" data-testid="stripe-webhook-result">
          {webhook.created ? (
            <>
              <p>
                Webhook created for <code>{webhook.url}</code>. Copy the signing secret now, because Stripe shows it only once. In Vercel → Settings →
                Environment Variables add <code>STRIPE_WEBHOOK_SECRET</code> with this value, tick Production, then redeploy.
              </p>
              {webhook.secret && (
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={webhook.secret}
                    onFocus={(e) => e.currentTarget.select()}
                    className="bg-background min-w-0 flex-1 rounded-md border px-2 py-1.5 font-mono text-xs"
                    aria-label="Webhook signing secret"
                  />
                  <Button size="sm" variant="outline" onClick={() => void copy(webhook.secret!)}>
                    {copied ? <CheckIcon /> : <CopyIcon />} {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <p>
              The webhook for <code>{webhook.url}</code> already existed
              {webhook.addedEvents.length ? ` and was completed with: ${webhook.addedEvents.join(", ")}` : " and has every event it needs"}. Stripe shows the
              signing secret only when an endpoint is created. If you do not have it: Stripe → Developers → Webhooks → this endpoint → Signing secret → Reveal,
              and put it in Vercel as <code>STRIPE_WEBHOOK_SECRET</code>.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
