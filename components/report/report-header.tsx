"use client";

import {
  BookPlusIcon,
  CalendarClockIcon,
  CarFrontIcon,
  CheckIcon,
  ChevronLeftIcon,
  CopyIcon,
  EllipsisIcon,
  ExternalLinkIcon,
  EyeIcon,
  FileDownIcon,
  FileTextIcon,
  GaugeIcon,
  KeyRoundIcon,
  Link2Icon,
  MapPinIcon,
  PowerIcon,
  RefreshCwIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CarVisual } from "@/components/vehicle/car-art";
import { auctionPhotoUrl, lotVisual } from "@/lib/analysis/visual";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n/client";
import { countdownLabel, damageLabel, keysLabel, runLabel, titleLabel } from "@/lib/i18n/labels";
import { cn, formatNumber } from "@/lib/utils";

import { useReport } from "./report-context";

export function ReportHeader() {
  const { view, calc } = useReport();
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

  const odoBad = l.odometerBrand === "NOT_ACTUAL" || l.odometerBrand === "EXCEEDS_MECHANICAL_LIMITS";
  const titleBad = l.titleCategory === "NON_REPAIRABLE" || l.titleCategory === "PARTS_ONLY";
  const specs: { icon: typeof GaugeIcon; label: string; tone?: "stop" | "caution" | "go" }[] = [
    ...(l.odometer !== null
      ? [
          {
            icon: GaugeIcon,
            label: `${formatNumber(l.odometer)} ${l.odometerUnit}${l.odometerBrand !== "ACTUAL" && l.odometerBrand !== "UNKNOWN" ? ` · ${t(`report.odoBrand.${l.odometerBrand}`)}` : ""}`,
            tone: odoBad ? ("stop" as const) : undefined,
          },
        ]
      : []),
    { icon: FileTextIcon, label: titleLabel(t, l.titleCategory), tone: titleBad ? "stop" : l.titleCategory === "CLEAN" ? "go" : undefined },
    ...(l.primaryDamage ? [{ icon: CarFrontIcon, label: damageLabel(t, l.primaryDamage) }] : []),
    { icon: PowerIcon, label: runLabel(t, l.runCondition), tone: l.runCondition === "WONT_START" ? "caution" : undefined },
    { icon: KeyRoundIcon, label: keysLabel(t, l.hasKeys), tone: l.hasKeys === false ? "caution" : undefined },
  ];

  const visual = lotVisual({
    listing: l,
    vehicle: view.vehicle,
    damage: view.damage,
    verdict: calc?.verdict ?? view.calc?.verdict,
    photo: view.photos.find((p) => !p.url.startsWith("/demo-photos/"))?.url ?? (view.readOnly ? null : auctionPhotoUrl(view.listing?.photoUrls)),
  });

  return (
    <div className="space-y-4">
      <Link href="/app/history" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm">
        <ChevronLeftIcon className="size-4" /> {t("nav.history")}
      </Link>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <CarVisual {...visual} label={title} className="rise aspect-[16/9] w-full shrink-0 rounded-2xl border sm:w-[22rem]" />
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
            <Badge variant="secondary" className="font-semibold">
              {t(`domain.source.${l.source}`)}
            </Badge>
            {l.lotNumber && <span className="num">{t("report.lot", { lot: l.lotNumber })}</span>}
            {l.sourceUrl && (
              <a
                href={l.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground inline-flex items-center gap-1 underline-offset-4 hover:underline"
              >
                {t("report.viewListing")} <ExternalLinkIcon className="size-3.5" />
              </a>
            )}
            {view.isDemo && <Badge variant="info">{t("report.demoData")}</Badge>}
          </div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl" data-testid="report-title">
            {title} {l.trim && <span className="text-muted-foreground font-normal">{l.trim}</span>}
          </h1>
          <div className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
            {l.saleDate && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarClockIcon className="size-4" /> {t("report.sale", { when: countdownLabel(t, l.saleDate) })}
              </span>
            )}
            {(l.location.city || l.location.state) && (
              <span className="inline-flex items-center gap-1.5">
                <MapPinIcon className="size-4" />
                {[l.location.yardName ?? l.location.city, l.location.state].filter(Boolean).join(", ")}
              </span>
            )}
          </div>
          <ul className="flex flex-wrap gap-2 pt-1.5" aria-label={t("report.listing")}>
            {specs.map((sp) => (
              <li
                key={sp.label}
                className={cn(
                  "bg-card inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm",
                  sp.tone === "stop" && "border-stop/40 bg-stop-soft text-stop",
                  sp.tone === "caution" && "border-caution/40 bg-caution-soft text-caution",
                  sp.tone === "go" && "border-go/30 bg-go-soft text-go",
                )}
              >
                <sp.icon className={cn("size-4 shrink-0", !sp.tone && "text-muted-foreground")} aria-hidden="true" />
                {sp.label}
              </li>
            ))}
          </ul>
        </div>
        {!view.readOnly && (
          <div className="flex shrink-0 items-center gap-2">
            <Button size="sm" variant={watched ? "secondary" : "outline"} onClick={() => void toggleWatch()} disabled={busy} data-testid="watch-button">
              {watched ? <CheckIcon /> : <EyeIcon />} {watched ? t("report.watching") : t("report.watch")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => void share()}>
              <Link2Icon /> {t("report.share")}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="outline" className="size-8" aria-label={t("report.moreActions")}>
                  <EllipsisIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <a href={`/api/analyses/${view.id}/pdf`}>
                    <FileDownIcon /> {t("report.downloadPdf")}
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/app/journal?analysisId=${view.id}`}>
                    <BookPlusIcon /> {t("report.logOutcome")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled={busy} onSelect={() => void rerun()}>
                  <RefreshCwIcon /> {t("report.rerun")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
