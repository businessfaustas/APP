"use client";

import { ChevronLeftIcon, ChevronRightIcon, Maximize2Icon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { PhotoView } from "@/lib/analysis/view";
import { useT } from "@/lib/i18n/client";
import { trText } from "@/lib/i18n/generated";
import { cn } from "@/lib/utils";

export function PhotoGallery({ photos, findings, highlight }: { photos: PhotoView[]; findings: Map<number, string>; highlight: Set<number> | null }) {
  const [open, setOpen] = useState<number | null>(null);
  const t = useT();
  if (photos.length === 0) return <p className="text-muted-foreground text-sm">{t("report.noPhotos")}</p>;
  const current = open !== null ? photos[open] : undefined;
  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-4">
        {photos.map((p, i) => {
          const dim = highlight !== null && !highlight.has(p.position);
          const finding = findings.get(p.position);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setOpen(i)}
              className={cn(
                "group bg-surface-2 hover:border-primary/50 focus-visible:ring-ring/50 overflow-hidden rounded-xl border text-left transition-[opacity,border-color] outline-none focus-visible:ring-[3px]",
                dim && "opacity-35",
              )}
            >
              <div className="relative overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.url}
                  alt={finding ? trText(t, finding) : t("report.photoN", { n: p.position })}
                  loading="lazy"
                  className="aspect-[16/9] w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
                <span className="num absolute top-2 left-2 grid size-6 place-items-center rounded-md bg-black/60 text-[11px] font-semibold text-white backdrop-blur">
                  {p.position}
                </span>
                <span className="absolute right-2 bottom-2 grid size-7 place-items-center rounded-md bg-black/60 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
                  <Maximize2Icon className="size-3.5" aria-hidden="true" />
                </span>
              </div>
              <div className="px-3 py-2.5">
                <p className="text-muted-foreground line-clamp-2 min-h-[2.1rem] text-xs leading-[1.05rem]">
                  {finding ? trText(t, finding) : t("report.noFindings")}
                </p>
              </div>
            </button>
          );
        })}
      </div>
      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-[calc(100%-1rem)] p-3 sm:max-w-4xl">
          {current && (
            <div className="space-y-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={current.url} alt={findings.get(current.position) ?? ""} className="max-h-[70dvh] w-full rounded-xl object-contain" />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <DialogTitle className="text-base">{t("report.photoN", { n: current.position })}</DialogTitle>
                  <DialogDescription>{findings.get(current.position) ? trText(t, findings.get(current.position)!) : t("report.noFindings")}</DialogDescription>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    size="icon"
                    variant="outline"
                    aria-label={t("report.prevPhoto")}
                    onClick={() => setOpen((o) => (o === null ? 0 : (o - 1 + photos.length) % photos.length))}
                  >
                    <ChevronLeftIcon />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    aria-label={t("report.nextPhoto")}
                    onClick={() => setOpen((o) => (o === null ? 0 : (o + 1) % photos.length))}
                  >
                    <ChevronRightIcon />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
