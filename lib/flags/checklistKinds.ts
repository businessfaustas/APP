/**
 * What kind of job a "Before you bid" step is, from its (English) text, so the checklist can tag and count them.
 * Pure — unit tested. The text is the same English source line the checklist is built from; translation happens at display.
 */
export type StepKind = "inspect" | "paperwork" | "money" | "logistics";

export const STEP_KINDS: readonly StepKind[] = ["inspect", "paperwork", "money", "logistics"];

const RULES: [StepKind, RegExp][] = [
  // order matters: the first match wins
  ["logistics", /\bpickup\b|\bstorage\b|\bapproval\b|\btransport\b|\bship/i],
  ["money", /\bbudget\b|\bfee\b|\bfees\b|\bcost\b|\bprice\b|\bcalibration\b|\bprogramming\b/i],
  ["paperwork", /\btitle\b|\bVIN\b|\brecalls?\b|\bNICB\b|\brebuilt\b|\bkeys? (?:are )?included\b|\bfee chart\b/i],
];

export function stepKind(text: string): StepKind {
  // "Verify the auction's current fee chart…" is paperwork even though it mentions fees
  if (/\bfee chart\b/i.test(text)) return "paperwork";
  for (const [kind, re] of RULES) if (re.test(text)) return kind;
  return "inspect";
}

export function countKinds(items: readonly string[]): Record<StepKind, number> {
  const out: Record<StepKind, number> = { inspect: 0, paperwork: 0, money: 0, logistics: 0 };
  for (const i of items) out[stepKind(i)]++;
  return out;
}
