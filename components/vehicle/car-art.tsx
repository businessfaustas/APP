"use client";

import { useId, useState } from "react";

import type { DamageZone } from "@/lib/domain/schemas";
import { cn } from "@/lib/utils";
import { damageSpot, type BodyType } from "@/lib/vehicle/art";
import { pickCarLook, type CarLook } from "@/lib/vehicle/looks";

import { NoPreview } from "./no-preview";

export type { BodyType };
export type Tone = "go" | "caution" | "stop" | "neutral";

/** Picks a body from what we know about the car. */
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
  if (/\bm[2-8]\b|mustang|camaro|corvette|challenger|supra|\b911\b|cayman|boxster|\bgt-?r\b|370z|400z|\bbrz\b|gr86|coupe|roadster|convertible/.test(s))
    return "coupe";
  return "sedan";
}

const TONE_GLOW: Record<Tone, string> = {
  go: "var(--go)",
  caution: "var(--caution)",
  stop: "var(--stop)",
  neutral: "var(--primary)",
};

/**
 * A car on a studio floor: the cut-out photo, a soft ground shadow and glow in the verdict's
 * colour, and (when asked) the damaged zones marked and a scan sweeping over it.
 * It fills the same 400 : 180 stage the old drawing did, so it can be dropped in anywhere.
 */
export function CarArt({
  body = "sedan",
  zones = [],
  tone = "neutral",
  paint,
  seed,
  look,
  scanning = false,
  showDamage = true,
  className,
  label,
}: {
  body?: BodyType;
  zones?: { zone: DamageZone; severity: number }[];
  tone?: Tone;
  /** The listing's paint colour (#rrggbb): the photo closest to it is shown. */
  paint?: string;
  /** The lot's make and model text: a photo made for that model is preferred, and ties are broken by it. */
  seed?: string;
  /** Show this photo instead of choosing one (the showcase uses a wrecked sedan). */
  look?: CarLook;
  scanning?: boolean;
  showDamage?: boolean;
  className?: string;
  label?: string;
}) {
  const id = useId();
  const car = look ?? pickCarLook(body, paint, seed);
  const hits = showDamage ? zones.filter((z) => z.severity > 0) : [];
  const glow = TONE_GLOW[tone];
  return (
    <div
      className={cn("[container-type:inline-size] relative aspect-[400/180] w-full", className)}
      role="img"
      aria-label={label ?? "Vehicle"}
      data-testid="car-art"
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-[5%] bottom-[2%] h-[26%] rounded-[50%] blur-sm"
        style={{ background: `radial-gradient(closest-side, color-mix(in oklab, ${glow} 38%, transparent), transparent)` }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-[10%] bottom-[10.5%] h-[7%] rounded-[50%]"
        style={{ background: "radial-gradient(closest-side, rgb(0 0 0 / 0.5), transparent)" }}
      />
      {/* the car box: the same left edge, width and ground line as the drawing it replaces */}
      <div className="absolute bottom-[15.5%] left-[7%] w-[86.5%]">
        {/* eslint-disable @next/next/no-img-element */}
        <img
          src={car.src}
          alt=""
          width={900}
          height={Math.round(900 / car.ratio)}
          className="block h-auto w-full select-none"
          draggable={false}
          decoding="async"
        />
        {/* eslint-enable @next/next/no-img-element */}
        {hits.map((h) => {
          const s = damageSpot(body, h.zone);
          const k = 0.8 + Math.min(10, h.severity) / 18;
          const w = Math.min(0.45, s.w * k);
          return (
            <span key={`${id}-${h.zone}`} aria-hidden="true" className="absolute" style={{ left: `${s.x * 100}%`, top: `${s.y * 100}%` }}>
              <span
                className="glow-pulse absolute aspect-[1.25] -translate-x-1/2 -translate-y-1/2 rounded-[50%]"
                style={{
                  width: `${w * 346 * 0.29}%`,
                  minWidth: "12%",
                  background: "radial-gradient(closest-side, rgb(255 59 59 / 0.75), rgb(255 59 59 / 0.25) 55%, transparent)",
                }}
              />
              <span className="ping absolute size-[clamp(9px,4.6cqw,20px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#ff4d4d]" />
              <span className="absolute size-[clamp(5px,2.3cqw,11px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-[#ff4040] shadow-[0_0_8px_rgb(255_64_64/0.8)]" />
            </span>
          );
        })}
        {scanning && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-x-[4%] -inset-y-[6%] overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_25%,black_75%,transparent)]"
          >
            <div
              className="scan absolute inset-y-0 left-0 w-[45%]"
              style={{ background: "linear-gradient(90deg, transparent, color-mix(in oklab, var(--primary) 34%, transparent) 50%, transparent)" }}
            />
          </div>
        )}
      </div>
    </div>
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
  seed,
  fallback = "art",
  className,
  label,
  scanning,
}: {
  photo?: string | null;
  body?: BodyType;
  zones?: { zone: DamageZone; severity: number }[];
  tone?: Tone;
  paint?: string;
  seed?: string;
  /** With no photo: the car illustration (default, marks damage) or a "no preview" tile with our logo (for lists and cards). */
  fallback?: "art" | "placeholder";
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
      ) : fallback === "placeholder" && !scanning ? (
        <NoPreview tone={tone} label={label} />
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
            <CarArt body={body} zones={zones} tone={tone} paint={paint} seed={seed} label={label} scanning={scanning} />
          </div>
        </>
      )}
    </div>
  );
}
