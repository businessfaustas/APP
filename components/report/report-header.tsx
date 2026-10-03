"use client";

import {
  BookPlusIcon,
  CalendarClockIcon,
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  EyeIcon,
  FileDownIcon,
  Link2Icon,
  MapPinIcon,
  RefreshCwIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n/client";
import { countdownLabel, damageLabel, keysLabel, runLabel, titleLabel } from "@/lib/i18n/labels";
import { cn, formatNumber } from "@/lib/utils";

import { useReport } from "./report-context";

export function ReportHeader() {
  const { view } = useReport();
  const router = useRouter();
  const t = useT();
  const l = view.listing;
  const [watched, setWatched] = useState(view.watchlisted);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!l) return null;
  const title = [l.year, l.make, l.model].filter(Boolean).join(" ") || t("report.vehicle");

  async function toggleWatch() {
    setBusy(true);
    try {
      const res = watched
        ? await fetch(`/api/watchlist?analysisId=${view.id}`, { method: "DELETE" })
        : await fetch("/api/watchlist", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ analysisId: view.id }) });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? t("report.failed"));
      setWatched(!watched);
      toast.success(watched ? t("report.watchRemoved") : t("report.watchAdded"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("report.failed"));
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    const res = await fetch(`/api/analyses/${view.id}/share`, { method: "POST" });
    const body = (await res.json()) as { url?: string; error?: string };
    if (!res.ok || !body.url) return toast.error(body.error ?? t("report.shareFailed"));
    setShareUrl(body.url);
    setShareOpen(true);
  }

  async function revoke() {
    await fetch(`/api/analyses/${view.id}/share`, { method: "DELETE" });
    setShareUrl(null);
    setShareOpen(false);
    toast.success(t("report.shareRevoked"));
  }

  async function rerun() {
    setBusy(true);
    const res = await fetch(`/api/analyses/${view.id}/rerun`, { method: "POST" });
    const body = (await res.json()) as { id?: string; error?: string };
    setBusy(false);
    if (!res.ok || !body.id) return toast.error(body.error ?? t("report.rerunFailed"));
    router.push(`/app/analyses/${body.id}`);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-1.5">
          <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="outline">{t(`domain.source.${l.source}`)}</Badge>
            {l.lotNumber && <span>{t("report.lot", { lot: l.lotNumber })}</span>}
            {l.sourceUrl && (
              <a href={l.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:text-foreground inline-flex items-center gap-1">
                {t("report.viewListing")} <ExternalLinkIcon className="size-3" />
              </a>
            )}
            {view.isDemo && <Badge variant="info">{t("report.demoData")}</Badge>}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl" data-testid="report-title">
            {title} <span className="text-muted-foreground font-normal">{l.trim}</span>
          </h1>
          <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {l.saleDate && (
              <span className="inline-flex items-center gap-1">
                <CalendarClockIcon className="size-3.5" /> {t("report.sale", { when: countdownLabel(t, l.saleDate) })}
              </span>
            )}
            {(l.location.city || l.location.state) && (
              <span className="inline-flex items-center gap-1">
                <MapPinIcon className="size-3.5" />
                {[l.location.yardName ?? l.location.city, l.location.state].filter(Boolean).join(", ")}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {l.odometer !== null && (
              <Badge variant={l.odometerBrand === "NOT_ACTUAL" || l.odometerBrand === "EXCEEDS_MECHANICAL_LIMITS" ? "stop" : "secondary"}>
                {formatNumber(l.odometer)} {l.odometerUnit}
                {l.odometerBrand !== "ACTUAL" && l.odometerBrand !== "UNKNOWN" ? ` · ${t(`report.odoBrand.${l.odometerBrand}`)}` : ""}
              </Badge>
            )}
            <Badge
              variant={l.titleCategory === "NON_REPAIRABLE" || l.titleCategory === "PARTS_ONLY" ? "stop" : l.titleCategory === "CLEAN" ? "go" : "secondary"}
            >
              {titleLabel(t, l.titleCategory)}
            </Badge>
            {l.primaryDamage && <Badge variant="secondary">{damageLabel(t, l.primaryDamage).toLowerCase()}</Badge>}
            <Badge variant={l.runCondition === "WONT_START" ? "caution" : "secondary"}>{runLabel(t, l.runCondition)}</Badge>
            <Badge variant={l.hasKeys === false ? "caution" : "secondary"}>{keysLabel(t, l.hasKeys)}</Badge>
          </div>
        </div>
        {!view.readOnly && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={watched ? "secondary" : "outline"} onClick={() => void toggleWatch()} disabled={busy} data-testid="watch-button">
              {watched ? <CheckIcon /> : <EyeIcon />} {watched ? t("report.watching") : t("report.watch")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => void share()}>
              <Link2Icon /> {t("report.share")}
            </Button>
            <Button size="sm" variant="outline" asChild>
              <a href={`/api/analyses/${view.id}/pdf`}>
                <FileDownIcon /> PDF
              </a>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href={`/app/journal?analysisId=${view.id}`}>
                <BookPlusIcon /> {t("report.logOutcome")}
              </Link>
            </Button>
            <Button size="sm" variant="ghost" onClick={() => void rerun()} disabled={busy}>
              <RefreshCwIcon /> {t("report.rerun")}
            </Button>
          </div>
        )}
      </div>
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("report.shareTitle")}</DialogTitle>
            <DialogDescription>{t("report.shareBody")}</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input readOnly value={shareUrl ?? ""} onFocus={(e) => e.currentTarget.select()} />
            <Button
              variant="outline"
              size="icon"
              aria-label={t("report.copyLink")}
              onClick={() => {
                if (shareUrl) void navigator.clipboard.writeText(shareUrl).then(() => toast.success(t("report.linkCopied")));
              }}
            >
              <CopyIcon />
            </Button>
          </div>
          <Button variant="ghost" className={cn("text-stop justify-self-start")} onClick={() => void revoke()}>
            {t("report.revokeLink")}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
