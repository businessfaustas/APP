"use client";

import { useEffect, useRef, useState } from "react";

const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * A number that glides to its new value when it changes (e.g. while moving a what-if slider).
 * The first render shows the final value (or `from`, to count up when the page opens), so
 * server and client HTML match.
 */
export function CountTo({
  value,
  format,
  from: initial,
  duration = 650,
  className,
}: {
  value: number;
  format: (n: number) => string;
  from?: number;
  duration?: number;
  className?: string;
}) {
  const [shown, setShown] = useState(initial ?? value);
  const from = useRef(initial ?? value);
  useEffect(() => {
    const start = from.current;
    if (start === value || prefersReducedMotion()) {
      from.current = value;
      const id = requestAnimationFrame(() => setShown(value));
      return () => cancelAnimationFrame(id);
    }
    let raf = 0;
    let t0: number | null = null;
    const step = (ts: number) => {
      t0 ??= ts;
      const p = Math.min(1, (ts - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const next = Math.round(start + (value - start) * eased);
      from.current = next;
      setShown(next);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <span className={className}>{format(shown)}</span>;
}
