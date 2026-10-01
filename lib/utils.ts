import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** The moment `days` days before now. */
export function daysAgo(days: number): Date {
  return new Date(Date.now() - days * DAY_MS);
}

/** True when the date is in the past (null/invalid → false). */
export function isPast(d: Date | string | null | undefined): boolean {
  if (!d) return false;
  const t = new Date(d).getTime();
  return Number.isFinite(t) && t < Date.now();
}

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/** Formats whole dollars as `$12,390` (negative: `−$791`). */
export function formatUsd(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "—";
  if (amount < 0) return `−${usd.format(Math.abs(amount))}`;
  return usd.format(amount);
}

/** Formats basis points as a percentage, e.g. 2551 → "25.5%". */
export function formatBps(bps: number | null | undefined, digits = 1): string {
  if (bps === null || bps === undefined || Number.isNaN(bps)) return "—";
  return `${(bps / 100).toFixed(digits)}%`;
}

export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US").format(n);
}

export function formatMiles(n: number | null | undefined, unit: "mi" | "km" = "mi"): string {
  if (n === null || n === undefined) return "—";
  return `${formatNumber(n)} ${unit}`;
}

export function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}

/** "in 2d 4h", "in 35m", "ended" */
export function formatCountdown(target: Date | string | null | undefined, now: Date = new Date()): string {
  if (!target) return "—";
  const t = typeof target === "string" ? new Date(target) : target;
  const ms = t.getTime() - now.getTime();
  if (ms <= 0) return "sale ended";
  const mins = Math.floor(ms / 60000);
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  if (days > 0) return `in ${days}d ${hours}h`;
  if (hours > 0) return `in ${hours}h ${m}m`;
  return `in ${m}m`;
}

export function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/[\s_]+/)
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${String(x)}`);
}
