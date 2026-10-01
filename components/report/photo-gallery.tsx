"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { PhotoView } from "@/lib/analysis/view";
import { cn } from "@/lib/utils";

export function PhotoGallery({ photos, findings, highlight }: { photos: PhotoView[]; findings: Map<number, string>; highlight: Set<number> | null }) {
  const [open, setOpen] = useState<number | null>(null);
  if (photos.length === 0) return <p className="text-sm text-muted-foreground">No photos were available for this listing.</p>;
  const current = open !== null ? photos[open] : undefined;
  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {photos.map((p, i) => {
          const dim = highlight !== null && !highlight.has(p.position);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setOpen(i)}
              className={cn("group relative overflow-hidden rounded-lg border bg-muted text-left transition-opacity", dim && "opacity-35")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={findings.get(p.position) ?? `Photo ${p.position}`} loading="lazy" className="aspect-[16/9] w-full object-cover transition-transform group-hover:scale-[1.02]" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-2 pt-6 pb-1.5 text-[11px] text-white">
                <span className="font-semibold">{p.position}</span> {findings.get(p.position) ?? ""}
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
              <img src={current.url} alt={findings.get(current.position) ?? ""} className="max-h-[70dvh] w-full rounded-md object-contain" />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <DialogTitle className="text-base">Photo {current.position}</DialogTitle>
                  <DialogDescription>{findings.get(current.position) ?? "No AI findings for this photo."}</DialogDescription>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="icon" variant="outline" aria-label="Previous photo" onClick={() => setOpen((o) => (o === null ? 0 : (o - 1 + photos.length) % photos.length))}>
                    <ChevronLeftIcon />
                  </Button>
                  <Button size="icon" variant="outline" aria-label="Next photo" onClick={() => setOpen((o) => (o === null ? 0 : (o + 1) % photos.length))}>
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
