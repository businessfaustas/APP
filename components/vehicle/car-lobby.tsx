"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import type { DamageZone } from "@/lib/domain/schemas";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { lobbyOrder, type CarLook } from "@/lib/vehicle/looks";

import { CarArt, type BodyType, type Tone } from "./car-art";

const INTERVAL_MS = 3800;
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/** True for people who asked their device for less motion; follows the setting live, and is false while rendering on the server. */
function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(REDUCED_MOTION);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

/**
 * A lobby of cars: the cut-out photos take turns on the studio floor, each sliding in as the last one rolls out,
 * instead of one car sitting there forever. It fills the same 400 : 180 stage as `CarArt`, so it can be dropped in
 * wherever that is used.
 *
 *  - Damage markers only ever go on the wrecked showcase sedan (or on `lock`): a clean car is never marked.
 *  - `lock` stops the show on one car, with its markers, for when the scan has found the real lot's damage.
 *  - It never moves for people who asked for reduced motion, and it holds still while the mouse is on it. The cars
 *    beyond the first load a moment after the page does.
 */
export function CarLobby({
  first,
  lock,
  zones = [],
  body = "sedan",
  tone = "neutral",
  scanning = true,
  intervalMs = INTERVAL_MS,
  className,
  label,
}: {
  /** The car to start on (default: the wrecked showcase sedan). */
  first?: CarLook;
  /** Stop on this car and show `zones` on it. */
  lock?: CarLook;
  zones?: { zone: DamageZone; severity: number }[];
  body?: BodyType;
  tone?: Tone;
  scanning?: boolean;
  intervalMs?: number;
  className?: string;
  label?: string;
}) {
  const t = useT();
  const order = useMemo(() => lobbyOrder(first), [first]);
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [engaged, setEngaged] = useState(false);
  const reduced = useReducedMotion();

  const locked = Boolean(lock);
  // The first car comes with the page; the rest are fetched once it has settled, so they never compete with it.
  const cars = locked ? [lock!] : loaded ? order : order.slice(0, 1);
  const n = cars.length;
  const active = locked ? 0 : index % n;

  useEffect(() => {
    const wake = window.setTimeout(() => setLoaded(true), 700);
    return () => window.clearTimeout(wake);
  }, []);

  useEffect(() => {
    if (locked || !loaded || engaged || reduced || n < 2) return;
    // Restarts after every change, so a car always gets its full turn.
    const timer = window.setTimeout(() => setIndex((i) => (i + 1) % n), intervalMs);
    return () => window.clearTimeout(timer);
  }, [locked, loaded, engaged, reduced, n, active, intervalMs]);

  return (
    <div
      className={cn("relative aspect-[400/180] w-full", className)}
      data-testid="car-lobby"
      onMouseEnter={() => setEngaged(true)}
      onMouseLeave={() => setEngaged(false)}
    >
      <div role="img" aria-label={label ?? t("visual.lobbyLabel")} className="absolute inset-0">
        {cars.map((car, k) => {
          const rel = (k - active + n) % n;
          const state = rel === 0 ? "active" : rel === n - 1 ? "leaving" : "waiting";
          return (
            <div
              key={car.src}
              aria-hidden="true"
              data-active={state === "active" ? "true" : undefined}
              data-src={car.src}
              className={cn(
                "absolute inset-0 transition-[opacity,transform,visibility] duration-[900ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none",
                state === "active" && "visible translate-x-0 opacity-100",
                state === "leaving" && "invisible -translate-x-[8%] opacity-0 motion-reduce:translate-x-0",
                state === "waiting" && "invisible translate-x-[8%] opacity-0 motion-reduce:translate-x-0",
              )}
            >
              <CarArt look={car} body={body} tone={tone} zones={car.damaged || locked ? zones : []} scanning={scanning && state === "active"} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
