"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";

export function UnsubscribeForm({ token }: { token: string | null }) {
  const t = useT();
  const [state, setState] = useState<"idle" | "working" | "done" | "invalid" | "error">(token ? "idle" : "invalid");

  async function confirm() {
    setState("working");
    try {
      const res = await fetch("/api/unsubscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ t: token }) });
      setState(res.ok ? "done" : res.status === 400 ? "invalid" : "error");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="space-y-4">
      {state === "idle" || state === "working" ? (
        <>
          <p className="text-muted-foreground text-sm">{t("unsubscribe.body")}</p>
          <Button onClick={() => void confirm()} disabled={state === "working"}>
            {state === "working" ? t("unsubscribe.working") : t("unsubscribe.confirm")}
          </Button>
        </>
      ) : (
        <p role={state === "done" ? "status" : "alert"} className="text-sm">
          {state === "done" ? t("unsubscribe.done") : state === "invalid" ? t("unsubscribe.invalid") : t("unsubscribe.failed")}
        </p>
      )}
      <Link href="/" className="text-muted-foreground block text-sm underline">
        {t("unsubscribe.home")}
      </Link>
    </div>
  );
}
