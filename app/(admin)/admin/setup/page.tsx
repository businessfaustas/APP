import { CircleCheckIcon, CircleDashedIcon, ExternalLinkIcon, FlaskConicalIcon } from "lucide-react";
import type { Metadata } from "next";

import { TestButton, VarChip } from "@/components/admin/setup-client";
import { ScoreRing } from "@/components/report/deal-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { features } from "@/lib/config/env";
import { integrations, type Integration, type Priority } from "@/lib/config/integrations";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Setup · Admin" };

const GROUPS: { priority: Priority; title: string; sub: string }[] = [
  { priority: "required", title: "Required for launch", sub: "Real customers can't use the app without these." },
  { priority: "recommended", title: "Recommended", sub: "Each one replaces a fallback with live data." },
  { priority: "optional", title: "Optional", sub: "Nice to have; the app works fine without them." },
];

function Row({ it }: { it: Integration }) {
  return (
    <Card className="gap-0 py-5" data-testid={`integration-${it.key}`}>
      <CardContent className="flex flex-col gap-4 px-5 md:flex-row md:items-start">
        <div className="flex min-w-0 flex-1 gap-3.5">
          {it.enabled ? (
            <CircleCheckIcon className="text-go mt-0.5 size-5 shrink-0" aria-hidden="true" />
          ) : (
            <CircleDashedIcon className="text-muted-foreground mt-0.5 size-5 shrink-0" aria-hidden="true" />
          )}
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{it.name}</span>
              <Badge variant={it.enabled ? "go" : "outline"}>{it.enabled ? "Connected" : "Using fallback"}</Badge>
            </div>
            <p className="text-sm">{it.unlocks}</p>
            {!it.enabled && <p className="text-muted-foreground text-sm">Without it: {it.without}</p>}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {it.vars.map((v) => (
                <VarChip key={v.name} {...v} />
              ))}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 md:flex-col md:items-end">
          <a
            href={it.docs}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary inline-flex items-center gap-1 text-sm font-medium hover:underline"
          >
            Get a key <ExternalLinkIcon className="size-3.5" />
          </a>
          {it.checkable && it.enabled && <TestButton integration={it.key} />}
        </div>
      </CardContent>
    </Card>
  );
}

export default function SetupPage() {
  const list = integrations();
  const done = list.filter((i) => i.enabled).length;
  const required = list.filter((i) => i.priority === "required");
  const requiredDone = required.filter((i) => i.enabled).length;
  const demo = features.demoMode();
  return (
    <div className="space-y-8">
      <section className="brand-glow bg-card flex flex-col gap-6 rounded-3xl border p-6 sm:flex-row sm:items-center sm:p-8">
        <ScoreRing score={Math.round((done / list.length) * 100)} size={96} label={`${done}/${list.length}`} caption="Connected" />
        <div className="flex-1 space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Connect your APIs</h1>
          <p className="text-muted-foreground max-w-2xl text-sm">
            Every feature already works with built-in fallbacks. Add a key and that part switches to live data — no code changes. {done} of {list.length}{" "}
            connected · required {requiredDone}/{required.length}.
          </p>
        </div>
      </section>

      <Card className="gap-0 py-5">
        <CardContent className="grid gap-5 px-5 md:grid-cols-3">
          {[
            ["1", "Open Vercel", "Your project → Settings → Environment Variables."],
            ["2", "Add the variable", "Click a name below to copy it, paste the key as its value, tick Production."],
            ["3", "Redeploy", "Deployments → ⋯ → Redeploy. This page turns green; press Test to confirm."],
          ].map(([n, title, body]) => (
            <div key={n} className="flex gap-3">
              <span className="bg-primary/12 text-primary grid size-7 shrink-0 place-items-center rounded-full text-sm font-semibold">{n}</span>
              <div>
                <div className="text-sm font-medium">{title}</div>
                <div className="text-muted-foreground text-sm">{body}</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div
        className={cn("flex items-start gap-3 rounded-2xl border px-5 py-4 text-sm", demo ? "bg-caution-soft border-caution/30" : "bg-go-soft border-go/30")}
      >
        <FlaskConicalIcon className={cn("mt-0.5 size-4 shrink-0", demo ? "text-caution" : "text-go")} aria-hidden="true" />
        <div>
          <span className="font-medium">Demo mode is {demo ? "on" : "off"}.</span>{" "}
          {demo
            ? "Sample lots and the “Continue as demo user” button are available. Set DEMO_MODE=false once sign-in works so customers only see real data."
            : "Only real providers and real accounts are used."}
        </div>
      </div>

      {GROUPS.map((g) => {
        const items = list.filter((i) => i.priority === g.priority);
        return (
          <section key={g.priority} className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">{g.title}</h2>
              <p className="text-muted-foreground text-sm">{g.sub}</p>
            </div>
            <div className="space-y-3">
              {items.map((it) => (
                <Row key={it.key} it={it} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
