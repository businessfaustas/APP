/**
 * Translates text the engine generated in English (risk flags, verdict reasons, checklist,
 * repair lines, provider notes) at display time. Each English template in `en.gen` is
 * compiled to a pattern; a match is re-rendered from the same key in the active language.
 * Text that matches nothing (e.g. what the AI wrote about the photos) is shown as-is.
 */
import { formatUsdPlain as usd } from "@/lib/calc/format";
import type { CalculationResult } from "@/lib/calc/types";
import type { RiskFlag } from "@/lib/domain/schemas";

import { en } from "./messages/en";
import type { Translator, Vars } from "./translate";

interface Pattern {
  key: string;
  re: RegExp;
  names: string[];
  literal: number;
}

let compiled: { exact: Map<string, string>; patterns: Pattern[] } | null = null;

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const norm = (s: string) => s.trim().toLowerCase();

function leaves(obj: unknown, prefix: string, out: [string, string][] = []): [string, string][] {
  if (typeof obj === "string") out.push([prefix, obj]);
  else if (obj && typeof obj === "object") for (const [k, v] of Object.entries(obj)) leaves(v, `${prefix}.${k}`, out);
  return out;
}

function index() {
  if (compiled) return compiled;
  const exact = new Map<string, string>();
  const patterns: Pattern[] = [];
  for (const [key, tpl] of leaves(en.gen, "gen")) {
    if (!tpl.trim()) continue;
    if (!tpl.includes("{")) {
      if (!exact.has(norm(tpl))) exact.set(norm(tpl), key);
      continue;
    }
    const names: string[] = [];
    let src = "^";
    let literal = 0;
    let last = 0;
    for (const m of tpl.matchAll(/\{(\w+)(?::([^{}]*))?\}/g)) {
      const text = tpl.slice(last, m.index);
      src += escape(text);
      literal += text.length;
      if (m[2] !== undefined)
        src += `(?:${m[2]
          .split("|")
          .map(escape)
          .sort((a, b) => b.length - a.length)
          .join("|")})`;
      else {
        names.push(m[1]!);
        src += "(.+?)";
      }
      last = m.index + m[0].length;
    }
    const tail = tpl.slice(last);
    src += `${escape(tail)}$`;
    literal += tail.length;
    patterns.push({ key, re: new RegExp(src, "is"), names, literal });
  }
  // The most specific template wins ("…above {max} (current bid {bid})." before "…above {max}.").
  patterns.sort((a, b) => b.literal - a.literal);
  compiled = { exact, patterns };
  return compiled;
}

/** A value inside a template ("This site", "undercarriage, engine bay") that is itself a known phrase. */
function translateValue(t: Translator, value: string): string {
  const { exact } = index();
  const key = exact.get(norm(value));
  if (key) return t.dyn(key, undefined, value);
  if (value.includes(", ")) {
    const parts = value.split(", ");
    if (parts.every((p) => exact.has(norm(p)))) return parts.map((p) => t.dyn(exact.get(norm(p))!, undefined, p)).join(", ");
  }
  return value;
}

/** English engine text → the active language (unchanged in English or when unknown). */
export function trText(t: Translator, text: string | null | undefined): string {
  if (!text) return text ?? "";
  if (t.locale === "en") return text;
  const { exact, patterns } = index();
  const key = exact.get(norm(text));
  if (key) return t.dyn(key, undefined, text);
  const trimmed = text.trim();
  for (const p of patterns) {
    const m = p.re.exec(trimmed);
    if (!m) continue;
    const vars: Vars = {};
    p.names.forEach((name, i) => {
      vars[name] = translateValue(t, m[i + 1] ?? "");
    });
    return t.dyn(p.key, vars, text);
  }
  return text;
}

const QUALIFIER = /^(.*?)\s*(?:\(([^()]+)\)|\b(LH|RH))$/i;

/** Repair part names, including qualifiers ("Headlamp assembly LH (LED)" → "Priekinis žibintas (kairė, LED)"). */
export function trPart(t: Translator, name: string): string {
  if (t.locale === "en") return name;
  const direct = trText(t, name);
  if (direct !== name) return direct;
  let base = name.trim();
  const qualifiers: string[] = [];
  for (let m = QUALIFIER.exec(base); m?.[1] && qualifiers.length < 3; m = QUALIFIER.exec(base)) {
    qualifiers.unshift(m[2] ?? m[3] ?? "");
    base = m[1].trim();
  }
  const translated = trText(t, base);
  if (translated === base) return name;
  return qualifiers.length ? `${translated} (${qualifiers.map((q) => trText(t, q)).join(", ")})` : translated;
}

export function trFlag(t: Translator, f: RiskFlag): { title: string; detail: string } {
  return { title: trText(t, f.title), detail: trText(t, f.detail) };
}

function lowerFirst(s: string): string {
  // Keep acronyms ("DI", "VIN") intact.
  return s.length > 1 && s[1] === s[1]!.toUpperCase() && s[1] !== s[1]!.toLowerCase() ? s : s.charAt(0).toLowerCase() + s.slice(1);
}

/**
 * The deterministic summary (`templateNarrative`) in the active language. Used instead of
 * the stored English summary, so the bullets match the rest of the translated report.
 */
export function localizedSummary(
  t: Translator,
  args: { calc: CalculationResult; currentBid: number | null; flags: RiskFlag[]; checklist: string[] },
): string[] {
  const { calc: c } = args;
  const e = c.scenarios.expected;
  const verdict = t(`domain.verdict.${c.verdict}`);
  const bullets: string[] = [];
  if (c.maxBid === null) {
    bullets.push(t("gen.summary.verdictNoBid", { verdict, target: usd(c.targetProfit) }));
  } else {
    bullets.push(
      args.currentBid !== null
        ? t("gen.summary.verdictMaxCurrent", { verdict, max: usd(c.maxBid), bid: usd(args.currentBid) })
        : t("gen.summary.verdictMax", { verdict, max: usd(c.maxBid) }),
    );
    if (e.profitAtMaxBid !== null)
      bullets.push(
        t("gen.summary.profit", {
          profit: usd(e.profitAtMaxBid),
          roi: e.roiAtMaxBidBps !== null ? t("gen.summary.roi", { roi: (e.roiAtMaxBidBps / 100).toFixed(1) }) : "",
          worst: usd(c.scenarios.worst.profitAtMaxBid ?? 0),
          best: usd(c.scenarios.best.profitAtMaxBid ?? 0),
        }),
      );
    if (c.comfortBid !== null) bullets.push(t("gen.summary.comfort", { comfort: usd(c.comfortBid) }));
  }
  bullets.push(
    t("gen.summary.costs", {
      repair: usd(e.repair),
      parts: usd(e.repairBreakdown.parts),
      labor: usd(e.repairBreakdown.labor),
      transport: usd(e.logistics),
      fees: c.feesAtMaxBid ? t("gen.summary.fees", { fees: usd(c.feesAtMaxBid.total) }) : "",
    }),
  );
  const risks = args.flags.filter((f) => f.level === "HARD_STOP" || f.level === "HIGH" || f.level === "MEDIUM").slice(0, 3);
  if (risks.length) bullets.push(t("gen.summary.risks", { risks: risks.map((r) => lowerFirst(trText(t, r.title))).join("; ") }));
  if (args.checklist.length)
    bullets.push(
      t("gen.summary.beforeBid", {
        items: args.checklist
          .slice(0, 2)
          .map((i) => trText(t, i))
          .join(" "),
      }),
    );
  return bullets;
}
