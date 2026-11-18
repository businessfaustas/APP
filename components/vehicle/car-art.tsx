"use client";

import { useId, useState } from "react";

import type { DamageZone } from "@/lib/domain/schemas";
import { cn } from "@/lib/utils";
import { carArtMarkup, type BodyType } from "@/lib/vehicle/art";

export type { BodyType };
export type Tone = "go" | "caution" | "stop" | "neutral";

/** Picks a silhouette from what we know about the car. */
export function bodyTypeOf(v: { bodyClass?: string | null; make?: string | null; model?: string | null; vehicleClass?: string | null }): BodyType {
  const s = `${v.bodyClass ?? ""} ${v.make ?? ""} ${v.model ?? ""}`.toLowerCase();
  if (/pickup|truck|f-?150|f-?250|silverado|sierra|\bram\b|tacoma|tundra|ranger|frontier|colorado|titan|gladiator|cybertruck/.test(s)) return "pickup";
  if (
    /suv|sport utility|crossover|multipurpose|\bvan\b|wagon|rav4|cr-v|cx-5|x3|x5|q5|q7|explorer|tahoe|highlander|pilot|model y|outback|forester|wrangler|grand cherokee/.test(
      s,
    )
  )
    return "suv";
  if (v.vehicleClass === "truck_suv") return "suv";
  return "sedan";
}

const TONE_GLOW: Record<Tone, string> = {
  go: "var(--go)",
  caution: "var(--caution)",
  stop: "var(--stop)",
  neutral: "var(--primary)",
};

export function CarArt({
  body = "sedan",
  zones = [],
  tone = "neutral",
  paint,
  scanning = false,
  showDamage = true,
  className,
  label,
}: {
  body?: BodyType;
  zones?: { zone: DamageZone; severity: number }[];
  tone?: Tone;
  /** Paint colour as #rrggbb (see paintOf); silver when omitted. */
  paint?: string;
  scanning?: boolean;
  showDamage?: boolean;
  className?: string;
  label?: string;
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  // Markup is built from constants and numbers only (lib/vehicle/art.ts); no user text reaches it.
  const html = carArtMarkup({ id: `c${id}`, body, paint, zones: showDamage ? zones : [], glow: TONE_GLOW[tone], scanning });
  return (
    <svg
      viewBox="0 0 400 180"
      className={cn("h-auto w-full", className)}
      role="img"
      aria-label={label ?? "Vehicle"}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * The picture for a lot: its real photo when there is one, otherwise the illustration
 * with the damaged areas marked, lit like a studio shot.
 */
export function CarVisual({
  photo,
  body,
  zones,
  tone = "neutral",
  paint,
  className,
  label,
  scanning,
}: {
  photo?: string | null;
  body?: BodyType;
  zones?: { zone: DamageZone; severity: number }[];
  tone?: Tone;
  paint?: string;
  className?: string;
  label?: string;
  scanning?: boolean;
}) {
  // A hot-linked auction image can be blocked or expired; then the illustration takes over.
  const [failed, setFailed] = useState<string | null>(null);
  const real = photo && !photo.startsWith("/demo-photos/") && photo !== failed ? photo : null;
  const line = "color-mix(in oklab, var(--foreground) 9%, transparent)";
  return (
    <div className={cn("bg-surface-2 relative isolate overflow-hidden", className)}>
      {real ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={real}
            alt={label ?? ""}
            className="absolute inset-0 size-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setFailed(real)}
          />
          {scanning && (
            <div className="scan absolute inset-0" aria-hidden="true">
              <div className="via-primary/40 h-full w-1/3 bg-gradient-to-r from-transparent to-transparent" />
            </div>
          )}
        </>
      ) : (
        <>
          <div
            className="absolute inset-0 -z-10"
            style={{ background: `radial-gradient(75% 65% at 50% 28%, color-mix(in oklab, ${TONE_GLOW[tone]} 24%, transparent), transparent 72%)` }}
            aria-hidden="true"
          />
          <div
            className="absolute inset-x-[-25%] bottom-0 -z-10 h-1/2 [mask-image:linear-gradient(to_top,black_20%,transparent)]"
            style={{
              backgroundImage: `linear-gradient(to right, ${line} 1px, transparent 1px), linear-gradient(to bottom, ${line} 1px, transparent 1px)`,
              backgroundSize: "28px 28px",
              transform: "perspective(260px) rotateX(58deg)",
              transformOrigin: "bottom",
            }}
            aria-hidden="true"
          />
          <div className="absolute inset-0 grid place-items-center px-[5%] pt-[2%]">
            <CarArt body={body} zones={zones} tone={tone} paint={paint} label={label} scanning={scanning} />
          </div>
        </>
      )}
    </div>
  );
}
