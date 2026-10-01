/**
 * Guards the LLM narrative: every $ amount and % it mentions must match (±$1 / ±0.1%) a
 * number present in the computed result, so the model cannot invent figures.
 * Pure — unit tested.
 */

function collectNumbers(value: unknown, out: number[]): void {
  if (typeof value === "number" && Number.isFinite(value)) {
    out.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const v of value) collectNumbers(v, out);
    return;
  }
  if (value && typeof value === "object") {
    for (const v of Object.values(value)) collectNumbers(v, out);
  }
}

export interface GuardResult {
  ok: boolean;
  offending: string[];
}

export function checkNarrative(text: string, facts: unknown): GuardResult {
  const nums: number[] = [];
  collectNumbers(facts, nums);
  const money = new Set(nums.map((n) => Math.abs(Math.round(n))));
  const pcts: number[] = [];
  for (const n of nums) {
    pcts.push(n / 100); // bps → %
    if (Math.abs(n) <= 1) pcts.push(n * 100); // fractions (confidence) → %
    pcts.push(n); // already a percent / severity
  }
  const offending: string[] = [];
  for (const m of text.matchAll(/[−-]?\$\s?(\d[\d,]*(?:\.\d+)?)(k)?/gi)) {
    let value = Number(m[1]!.replace(/,/g, ""));
    if (m[2]) value *= 1000;
    const v = Math.round(value);
    const hit = money.has(v) || money.has(v - 1) || money.has(v + 1) || (m[2] !== undefined && [...money].some((x) => Math.abs(x - v) <= 500));
    if (!hit) offending.push(m[0]);
  }
  for (const m of text.matchAll(/(\d+(?:\.\d+)?)\s?%/g)) {
    const v = Number(m[1]);
    if (!pcts.some((p) => Math.abs(Math.abs(p) - v) <= 0.1 + 1e-9 || Math.abs(Math.round(Math.abs(p)) - v) < 1e-9)) offending.push(m[0]);
  }
  return { ok: offending.length === 0, offending };
}
