"use client";

import { LogoArt } from "@/components/brand";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

type Tone = "go" | "caution" | "stop" | "neutral";

const GLOW: Record<Tone, string> = {
  go: "var(--go)",
  caution: "var(--caution)",
  stop: "var(--stop)",
  neutral: "var(--primary)",
};

/**
 * What a lot's picture shows when the auction published no photo: our logo large and faint behind a short
 * "No preview available" line, on a hatched panel lit in the verdict's colour. Used in lists and cards;
 * the report header and the scan animation keep the car illustration because they mark damage on it.
 * Sized with container units, so it reads the same in a 9rem thumbnail and a full-width card.
 */
export function NoPreview({ tone = "neutral", label, className }: { tone?: Tone; label?: string; className?: string }) {
  const t = useT();
  const text = t("visual.noPreview");
  return (
    <div
      className={cn("[container-type:inline-size] absolute inset-0 overflow-hidden", className)}
      role="img"
      aria-label={label ? `${label}: ${text}` : text}
      data-testid="no-preview"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background: `radial-gradient(80% 90% at 50% 15%, color-mix(in oklab, ${GLOW[tone]} 20%, transparent), transparent 70%), repeating-linear-gradient(135deg, transparent 0 9px, color-mix(in oklab, var(--foreground) 5%, transparent) 9px 10px)`,
        }}
      />
      <LogoArt className="absolute top-1/2 left-1/2 h-auto w-[84%] max-w-none -translate-x-1/2 -translate-y-[52%] -rotate-6 opacity-[0.13]" />
      <div className="absolute inset-x-0 bottom-[11%] flex justify-center px-[6%]">
        <span className="bg-background/70 text-muted-foreground inline-flex max-w-full items-center gap-[1.6cqw] rounded-full border px-[3.2cqw] py-[1.4cqw] [font-size:clamp(9px,3.6cqw,13px)] font-medium tracking-wide backdrop-blur-sm">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-[1.25em] shrink-0"
            aria-hidden="true"
          >
            <path d="M4.5 8.5h2.2l1.4-2.2h5.4l1.4 2.2h4.6a1.5 1.5 0 0 1 1.5 1.5v7.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5V10a1.5 1.5 0 0 1 1.5-1.5Z" />
            <circle cx={12} cy={13.5} r={3} />
            <path d="m3.5 3.5 17 17" className="text-background" strokeWidth={5} stroke="currentColor" />
            <path d="m3.5 3.5 17 17" />
          </svg>
          <span className="truncate">{text}</span>
        </span>
      </div>
    </div>
  );
}
