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

const eurFormats = new Map<string, Intl.NumberFormat>();

/** Formats euros: whole amounts without decimals (€29), others with two (€2.90). `29 €` in Lithuanian. */
export function formatEur(amount: number, locale = "en-US"): string {
  const digits = Number.isInteger(amount) ? 0 : 2;
  const key = `${locale}:${digits}`;
  let f = eurFormats.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", minimumFractionDigits: digits, maximumFractionDigits: digits });
    eurFormats.set(key, f);
  }
  return f.format(amount);
}

/** Formats basis points as a percentage, e.g. 2551 → "25.5%". */
/** Compact dollars for tight labels: $950, $4.9k, $12k, $1.2M. */
export function shortUsd(amount: number): string {
  const a = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (a >= 1_000_000) return `${sign}$${(a / 1_000_000).toFixed(a >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")}M`;
  if (a >= 10_000) return `${sign}$${Math.round(a / 1000)}k`;
  if (a >= 1000) return `${sign}$${(a / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return `${sign}$${Math.round(a)}`;
}

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

/** `locale` is an Intl locale such as "lt-LT" (see `INTL_LOCALE`). */
export function formatDateTime(d: Date | string | null | undefined, locale = "en-US"): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function formatDate(d: Date | string | null | undefined, locale = "en-US"): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date);
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
